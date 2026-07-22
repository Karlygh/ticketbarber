/**
 * Cloud Functions para contacto y eliminación de cuenta.
 */
/* eslint-disable require-jsdoc, max-len, linebreak-style */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {setGlobalOptions} from "firebase-functions/v2";
import {defineSecret, defineString} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import Stripe from "stripe";

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

setGlobalOptions({maxInstances: 10});

const ADMIN_EMAIL = defineString("ADMIN_EMAIL");
const GMAIL_USER = defineString("GMAIL_USER");
const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");

interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  phone?: string;
  message: string;
}

interface ContactResponse {
  success: boolean;
  message: string;
  contactId?: string;
}

interface PortalLinkRequest {
  returnUrl: string;
}

interface PortalLinkResponse {
  url: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function requireConfiguredValue(value: string | undefined, label: string): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    throw new HttpsError(
      "failed-precondition",
      `Falta configurar ${label} en el entorno de Cloud Functions.`
    );
  }
  return trimmed;
}

function validateReturnUrl(value: unknown): string {
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", "returnUrl debe ser una URL válida.");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new HttpsError("invalid-argument", "returnUrl debe ser una URL válida.");
  }

  const allowedOrigins = new Set([
    "http://localhost:4200",
    "http://127.0.0.1:4200",
    "https://ticketbarber-7c16d.web.app",
    "https://ticketbarber-7c16d.firebaseapp.com",
  ]);

  if (!allowedOrigins.has(url.origin)) {
    throw new HttpsError("permission-denied", "returnUrl no está permitido.");
  }

  return url.toString();
}

function resolveStripeCustomerId(data: FirebaseFirestore.DocumentData | undefined): string | null {
  if (!data) {
    return null;
  }

  const candidates = [
    data.stripeId,
    data.stripe_id,
    data.customer_id,
    data.customerId,
  ];

  const customerId = candidates.find((candidate) =>
    typeof candidate === "string" && candidate.startsWith("cus_")
  );

  return typeof customerId === "string" ? customerId : null;
}

function createMailer(): nodemailer.Transporter {
  const gmailUser = requireConfiguredValue(GMAIL_USER.value(), "GMAIL_USER");
  const gmailAppPassword = requireConfiguredValue(
    GMAIL_APP_PASSWORD.value(),
    "GMAIL_APP_PASSWORD"
  );

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });
}

function validateContactData(data: unknown): ContactRequest {
  if (!data || typeof data !== "object") {
    throw new HttpsError("invalid-argument", "Datos del formulario inválidos");
  }

  const typedData = data as Record<string, unknown>;
  const {name, email, subject, phone, message} = typedData;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    throw new HttpsError(
      "invalid-argument",
      "El nombre debe tener al menos 2 caracteres"
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== "string" || !emailRegex.test(email)) {
    throw new HttpsError("invalid-argument", "Email inválido");
  }

  if (!subject || typeof subject !== "string" || subject.trim().length < 3) {
    throw new HttpsError(
      "invalid-argument",
      "El asunto debe tener al menos 3 caracteres"
    );
  }

  if (phone && typeof phone === "string" && phone.trim().length > 0) {
    const phoneRegex = /^[0-9+\s()-]{9,}$/;
    if (!phoneRegex.test(phone)) {
      throw new HttpsError("invalid-argument", "Formato de teléfono inválido");
    }
  }

  if (!message || typeof message !== "string" || message.trim().length < 20) {
    throw new HttpsError(
      "invalid-argument",
      "El mensaje debe tener al menos 20 caracteres"
    );
  }

  return {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    subject: subject.trim(),
    phone: phone && typeof phone === "string" ? phone.trim() : undefined,
    message: message.trim(),
  };
}

async function checkRateLimit(email: string): Promise<void> {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const snapshot = await db
    .collection("contactos")
    .where("email", "==", email)
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();

  const recentCount = snapshot.docs.filter((contactDoc) => {
    const createdAt = contactDoc.data().createdAt;
    if (!createdAt) {
      return false;
    }
    const createdDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    return createdDate.getTime() > oneHourAgo;
  }).length;

  if (recentCount >= 3) {
    logger.warn("Rate limit exceeded for email", {email});
    throw new HttpsError(
      "resource-exhausted",
      "Has alcanzado el límite de envíos. Intenta más tarde."
    );
  }
}

function buildContactHtml(contactData: ContactRequest, contactId: string): string {
  const safeName = escapeHtml(contactData.name);
  const safeEmail = escapeHtml(contactData.email);
  const safeSubject = escapeHtml(contactData.subject);
  const safePhone = contactData.phone ? escapeHtml(contactData.phone) : "";
  const safeMessage = escapeHtml(contactData.message).replace(/\n/g, "<br>");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .field { margin-bottom: 20px; }
        .label { font-weight: bold; color: #4F46E5; display: block; margin-bottom: 5px; }
        .value { color: #1f2937; }
        .message-box { background: white; padding: 15px; border-left: 4px solid #4F46E5; margin-top: 10px; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0;">Nuevo mensaje de contacto - Ticketbarber</h2>
        </div>
        <div class="content">
          <div class="field">
            <span class="label">Nombre:</span>
            <span class="value">${safeName}</span>
          </div>
          <div class="field">
            <span class="label">Email:</span>
            <span class="value">${safeEmail}</span>
          </div>
          ${safePhone ? `
          <div class="field">
            <span class="label">Teléfono:</span>
            <span class="value">${safePhone}</span>
          </div>` : ""}
          <div class="field">
            <span class="label">Asunto:</span>
            <span class="value">${safeSubject}</span>
          </div>
          <div class="field">
            <span class="label">Mensaje:</span>
            <div class="message-box">${safeMessage}</div>
          </div>
          <div class="footer">
            <p>ID del contacto: ${escapeHtml(contactId)}</p>
            <p>Para responder, haz Reply a este email</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function deleteCollectionDocs(
  collectionPath: string,
  field?: string,
  value?: string
): Promise<void> {
  const collectionRef = db.collection(collectionPath);
  const snapshot = field && value ? await collectionRef.where(field, "==", value).get() : await collectionRef.get();

  if (snapshot.empty) {
    return;
  }

  let batch = db.batch();
  let operations = 0;

  for (const documentSnapshot of snapshot.docs) {
    batch.delete(documentSnapshot.ref);
    operations += 1;

    if (operations === 450) {
      await batch.commit();
      batch = db.batch();
      operations = 0;
    }
  }

  if (operations > 0) {
    await batch.commit();
  }
}

async function recursiveDeleteDocument(documentPath: string): Promise<void> {
  await db.recursiveDelete(db.doc(documentPath));
}

async function deleteUserStorage(uid: string): Promise<void> {
  const bucket = storage.bucket();
  await Promise.all([
    bucket.deleteFiles({prefix: `users/${uid}/`}).catch(() => undefined),
    bucket.deleteFiles({prefix: `shops/${uid}/`}).catch(() => undefined),
  ]);
}

export const sendContactEmail = onCall<ContactRequest, Promise<ContactResponse>>(
  {secrets: [GMAIL_APP_PASSWORD]},
  async (request) => {
    try {
      logger.info("Iniciando proceso de contacto", {data: request.data});

      const contactData = validateContactData(request.data);
      await checkRateLimit(contactData.email);

      const contactRef = await db.collection("contactos").add({
        name: contactData.name,
        email: contactData.email,
        subject: contactData.subject,
        phone: contactData.phone || null,
        message: contactData.message,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "pending",
      });

      const adminEmail = requireConfiguredValue(ADMIN_EMAIL.value(), "ADMIN_EMAIL");
      const gmailUser = requireConfiguredValue(GMAIL_USER.value(), "GMAIL_USER");
      const transporter = createMailer();
      const html = buildContactHtml(contactData, contactRef.id);

      await transporter.sendMail({
        from: `"Ticketbarber Contacto" <${gmailUser}>`,
        to: adminEmail,
        replyTo: contactData.email,
        subject: `[Ticketbarber] ${contactData.subject}`,
        html,
        text: [
          "Nuevo mensaje de contacto - Ticketbarber",
          "",
          `Nombre: ${contactData.name}`,
          `Email: ${contactData.email}`,
          ...(contactData.phone ? [`Teléfono: ${contactData.phone}`] : []),
          `Asunto: ${contactData.subject}`,
          "",
          "Mensaje:",
          contactData.message,
          "",
          `ID del contacto: ${contactRef.id}`,
          "Para responder, haz Reply a este email.",
        ].join("\n"),
      });

      logger.info("Email enviado exitosamente", {contactId: contactRef.id});
      return {
        success: true,
        message: "Mensaje enviado. Te responderemos pronto.",
        contactId: contactRef.id,
      };
    } catch (error: unknown) {
      const err = error as {message?: string; code?: string; stack?: string};
      logger.error("Error en sendContactEmail", {
        error: err.message,
        code: err.code,
        stack: err.stack,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "Error al procesar tu mensaje. Intenta de nuevo."
      );
    }
  }
);

export const createStripePortalLink = onCall<PortalLinkRequest, Promise<PortalLinkResponse>>(
  {
    cors: [
      "http://localhost:4200",
      "http://127.0.0.1:4200",
      "https://ticketbarber-7c16d.web.app",
      "https://ticketbarber-7c16d.firebaseapp.com",
    ],
    secrets: [STRIPE_SECRET_KEY],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes estar autenticado para gestionar tu suscripción."
      );
    }

    const uid = request.auth.uid;
    const returnUrl = validateReturnUrl(request.data?.returnUrl);
    const customerDoc = await db.doc(`customers/${uid}`).get();
    const customerId = resolveStripeCustomerId(customerDoc.data());

    if (!customerId) {
      logger.warn("Stripe customer not found for portal link", {uid});
      throw new HttpsError(
        "failed-precondition",
        "No se encontró el cliente de Stripe para esta cuenta."
      );
    }

    const stripeSecretKey = requireConfiguredValue(
      STRIPE_SECRET_KEY.value(),
      "STRIPE_SECRET_KEY"
    );
    const stripe = new Stripe(stripeSecretKey);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    if (!session.url) {
      throw new HttpsError(
        "internal",
        "Stripe no devolvió una URL válida para el portal."
      );
    }

    logger.info("Stripe portal link created", {uid, customerId});
    return {url: session.url};
  }
);

export const deleteAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Debes estar autenticado para eliminar tu cuenta."
    );
  }

  const uid = request.auth.uid;
  logger.info("Solicitud de eliminación de cuenta", {uid});

  await Promise.all([
    recursiveDeleteDocument(`users/${uid}`),
    recursiveDeleteDocument(`shops/${uid}`),
    recursiveDeleteDocument(`customers/${uid}`),
    recursiveDeleteDocument(`cancellation_feedback/${uid}`),
    deleteCollectionDocs("devices", "userId", uid),
    deleteCollectionDocs("device_codes", "userId", uid),
    deleteUserStorage(uid),
  ]);

  await admin.auth().deleteUser(uid);

  logger.info("Cuenta eliminada correctamente", {uid});
  return {success: true};
});
