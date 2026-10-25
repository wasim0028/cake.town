import { Resend } from "resend";
import { env, features, isTest } from "../config/env";
import { logger } from "../config/logger";

let resend: Resend | null = null;

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/** Test hook: every email "sent" while NODE_ENV=test or email is disabled lands here. */
export const sentEmails: EmailMessage[] = [];

export async function sendEmail(msg: EmailMessage): Promise<void> {
  if (!features.email || isTest) {
    sentEmails.push(msg);
    if (!isTest) logger.info({ to: msg.to, subject: msg.subject }, "Email (not sent: RESEND_API_KEY missing)");
    return;
  }
  resend ??= new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    ...(msg.text ? { text: msg.text } : {}),
    ...(msg.replyTo ? { replyTo: msg.replyTo } : {}),
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}
