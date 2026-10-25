import { env, features, isTest } from "../config/env";
import { logger } from "../config/logger";

/**
 * MSG91 Flow API. In India every SMS template must be DLT-registered first; put the approved
 * template ids in MSG91_TEMPLATE_*. Until then SMS is skipped and everything else keeps working.
 */
export const sentSms: { phone: string; templateId: string; vars: Record<string, string> }[] = [];

export async function sendSms(phone: string, templateId: string | undefined, vars: Record<string, string>) {
  if (!features.sms || !templateId || isTest) {
    sentSms.push({ phone, templateId: templateId ?? "(none)", vars });
    if (!isTest) logger.info({ phone, vars }, "SMS (not sent: MSG91 not configured)");
    return;
  }
  const res = await fetch("https://control.msg91.com/api/v5/flow", {
    method: "POST",
    headers: { authkey: env.MSG91_AUTH_KEY!, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      template_id: templateId,
      short_url: "0",
      recipients: [{ mobiles: `91${phone}`, ...vars }],
    }),
  });
  if (!res.ok) throw new Error(`MSG91 ${res.status}: ${await res.text()}`);
}
