/**
 * Cloud Function para formulario de contacto
 * Recibe datos del formulario, los guarda en Firestore y envía email
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {setGlobalOptions} from "firebase-functions/v2";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

// Inicializar Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Configuración global (máximo 10 instancias para control de costos)
setGlobalOptions({maxInstances: 10});

// ═════════════════════════════════════════════════════════════════════
// INTERFACES
// ═════════════════════════════════════════════════════════════════════

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

// ═════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN NODEMAILER
// ═════════════════════════════════════════════════════════════════════

// Configurar transporte de Gmail con App Password
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // SSL
  auth: {
    user: process.env.GMAIL_USER || "carlosgrandio6@gmail.com",
    pass: process.env.GMAIL_APP_PASSWORD || "semkhqmnkimudfmu",
  },
});

// ═════════════════════════════════════════════════════════════════════
// VALIDACIONES
// ═════════════════════════════════════════════════════════════════════

/**
 * Valida los datos del formulario de contacto
 * @param {unknown} data - Datos enviados desde el cliente
 * @return {ContactRequest} - Datos validados y sanitizados
 */
function validateContactData(data: unknown): ContactRequest {
  // Validar que data existe
  if (!data || typeof data !== "object") {
    throw new HttpsError(
      "invalid-argument",
      "Datos del formulario inválidos"
    );
  }

  const typedData = data as Record<string, unknown>;
  const {name, email, subject, phone, message} = typedData;

  // Validar nombre
  if (
    !name ||
    typeof name !== "string" ||
    name.trim().length < 2
  ) {
    throw new HttpsError(
      "invalid-argument",
      "El nombre debe tener al menos 2 caracteres"
    );
  }

  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (
    !email ||
    typeof email !== "string" ||
    !emailRegex.test(email)
  ) {
    throw new HttpsError("invalid-argument", "Email inválido");
  }

  // Validar asunto
  if (
    !subject ||
    typeof subject !== "string" ||
    subject.trim().length < 3
  ) {
    throw new HttpsError(
      "invalid-argument",
      "El asunto debe tener al menos 3 caracteres"
    );
  }

  // Validar teléfono (opcional)
  if (
    phone &&
    typeof phone === "string" &&
    phone.trim().length > 0
  ) {
    const phoneRegex = /^[0-9+\s()-]{9,}$/;
    if (!phoneRegex.test(phone)) {
      throw new HttpsError(
        "invalid-argument",
        "Formato de teléfono inválido"
      );
    }
  }

  // Validar mensaje
  if (
    !message ||
    typeof message !== "string" ||
    message.trim().length < 20
  ) {
    throw new HttpsError(
      "invalid-argument",
      "El mensaje debe tener al menos 20 caracteres"
    );
  }

  return {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    subject: subject.trim(),
    phone: phone && typeof phone === "string" ?
      phone.trim() : undefined,
    message: message.trim(),
  };
}

// ═════════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═════════════════════════════════════════════════════════════════════

/**
 * Verifica que el email no exceda el límite de envíos por hora
 * @param {string} email - Email del usuario
 */
async function checkRateLimit(email: string): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Consulta solo por email (índice automático), filtrar createdAt en memoria
  const snapshot = await db
    .collection("contactos")
    .where("email", "==", email)
    .get();

  const recentCount = snapshot.docs.filter((doc) => {
    const createdAt = doc.data().createdAt;
    if (!createdAt) return false;
    const ts = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    return ts > oneHourAgo;
  }).length;

  if (recentCount >= 3) {
    logger.warn(`Rate limit exceeded for email: ${email}`);
    throw new HttpsError(
      "resource-exhausted",
      "Has alcanzado el límite de envíos. Intenta más tarde."
    );
  }
}

// ═════════════════════════════════════════════════════════════════════
// CLOUD FUNCTION: sendContactEmail
// ═════════════════════════════════════════════════════════════════════

/**
 * Cloud Function para procesar formulario de contacto
 * Valida datos, guarda en Firestore y envía email via Gmail
 */
export const sendContactEmail = onCall<
  ContactRequest,
  Promise<ContactResponse>
>(
  async (request) => {
    try {
      logger.info("Iniciando proceso de contacto", {
        data: request.data,
      });

      // 1. Validar datos de entrada
      const contactData = validateContactData(request.data);

      // 2. Verificar rate limiting
      await checkRateLimit(contactData.email);

      // 3. Guardar en Firestore
      logger.info("Guardando contacto en Firestore", {
        email: contactData.email,
      });
      const contactRef = await db.collection("contactos").add({
        name: contactData.name,
        email: contactData.email,
        subject: contactData.subject,
        phone: contactData.phone || null,
        message: contactData.message,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "pending",
      });

      logger.info("Contacto guardado", {contactId: contactRef.id});

      // 4. Construir email HTML
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: #4F46E5;
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border: 1px solid #e5e7eb;
            }
            .field {
              margin-bottom: 20px;
            }
            .label {
              font-weight: bold;
              color: #4F46E5;
              display: block;
              margin-bottom: 5px;
            }
            .value {
              color: #1f2937;
            }
            .message-box {
              background: white;
              padding: 15px;
              border-left: 4px solid #4F46E5;
              margin-top: 10px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #6b7280;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">
                📧 Nuevo mensaje de contacto - Ticketbarber
              </h2>
            </div>
            <div class="content">
              <div class="field">
                <span class="label">Nombre:</span>
                <span class="value">${contactData.name}</span>
              </div>
              <div class="field">
                <span class="label">Email:</span>
                <span class="value">${contactData.email}</span>
              </div>
              ${contactData.phone ? `
              <div class="field">
                <span class="label">Teléfono:</span>
                <span class="value">${contactData.phone}</span>
              </div>
              ` : ""}
              <div class="field">
                <span class="label">Asunto:</span>
                <span class="value">${contactData.subject}</span>
              </div>
              <div class="field">
                <span class="label">Mensaje:</span>
                <div class="message-box">
                  ${contactData.message.replace(/\n/g, "<br>")}
                </div>
              </div>
              <div class="footer">
                <p>ID del contacto: ${contactRef.id}</p>
                <p>Para responder, haz Reply a este email</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // 5. Enviar email con Nodemailer
      logger.info("Enviando email a admin", {
        to: process.env.ADMIN_EMAIL || "carlosgrandio6@gmail.com",
      });

      const gmailUser = process.env.GMAIL_USER ||
        "carlosgrandio6@gmail.com";
      const adminEmail = process.env.ADMIN_EMAIL ||
        "carlosgrandio6@gmail.com";

      await transporter.sendMail({
        from: `"Ticketbarber Contacto" <${gmailUser}>`,
        to: adminEmail,
        replyTo: contactData.email,
        subject: `[Ticketbarber] ${contactData.subject}`,
        html: emailHtml,
        text: `
Nuevo mensaje de contacto - Ticketbarber

Nombre: ${contactData.name}
Email: ${contactData.email}
${contactData.phone ? `Teléfono: ${contactData.phone}` : ""}
Asunto: ${contactData.subject}

Mensaje:
${contactData.message}

ID del contacto: ${contactRef.id}
Para responder, haz Reply a este email.
        `.trim(),
      });

      logger.info("Email enviado exitosamente", {
        contactId: contactRef.id,
      });

      // 6. Retornar respuesta exitosa
      return {
        success: true,
        message: "Mensaje enviado. Te responderemos pronto.",
        contactId: contactRef.id,
      };
    } catch (error: unknown) {
      // Logging de error
      const err = error as {
        message?: string;
        code?: string;
        stack?: string;
      };
      logger.error("Error en sendContactEmail", {
        error: err.message,
        code: err.code,
        stack: err.stack,
      });

      // Si es un HttpsError que ya lanzamos, re-lanzarlo
      if (error instanceof HttpsError) {
        throw error;
      }

      // Para otros errores, lanzar error genérico
      throw new HttpsError(
        "internal",
        "Error al procesar tu mensaje. Intenta de nuevo."
      );
    }
  }
);

// ═════════════════════════════════════════════════════════════════════
// DELETE ACCOUNT
// Elimina todos los datos del usuario y su cuenta de Firebase Auth.
// Solo puede invocarse autenticado y solo borra el uid del token.
// ═════════════════════════════════════════════════════════════════════

export const deleteAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes estar autenticado para eliminar tu cuenta.");
  }

  const uid = request.auth.uid;
  logger.info("Solicitud de eliminación de cuenta", {uid});

  const collectionsToDelete = [
    `users/${uid}`,
    `shops/${uid}`,
    `cancellation_feedback/${uid}`,
  ];

  // Borrar documentos raíz del usuario
  await Promise.all(
    collectionsToDelete.map((path) => db.doc(path).delete().catch(() => { /* ya no existía */ }))
  );

  // Borrar subcolección de tickets del shop
  const ticketsRef = db.collection(`shops/${uid}/tickets`);
  const ticketsSnap = await ticketsRef.get();
  const deleteBatch = db.batch();
  ticketsSnap.docs.forEach((d) => deleteBatch.delete(d.ref));
  if (!ticketsSnap.empty) await deleteBatch.commit();

  // Borrar subcolecciones de Stripe (customers/{uid}/*)
  const stripeSubCollections = ["subscriptions", "payments", "checkout_sessions"];
  for (const sub of stripeSubCollections) {
    const snap = await db.collection(`customers/${uid}/${sub}`).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    if (!snap.empty) await batch.commit();
  }
  await db.doc(`customers/${uid}`).delete().catch(() => { /* ya no existía */ });

  // Borrar cuenta de Firebase Auth (siempre al final)
  await admin.auth().deleteUser(uid);

  logger.info("Cuenta eliminada correctamente", {uid});
  return {success: true};
});

