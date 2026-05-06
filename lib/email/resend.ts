import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY not set — emails will fail to send');
}

export const resend = new Resend(process.env.RESEND_API_KEY ?? '');

export const FROM_EMAIL = 'ProductShot <noreply@theproductshot.com>';
export const REPLY_TO = 'hello@theproductshot.com';
