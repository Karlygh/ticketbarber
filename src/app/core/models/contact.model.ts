/**
 * Modelos TypeScript para formulario de contacto
 * Sincronizan con las interfaces de Cloud Functions
 */

export interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  phone?: string;
  message: string;
}

export interface ContactResponse {
  success: boolean;
  message: string;
  contactId?: string;
}
