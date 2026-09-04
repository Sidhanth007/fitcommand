import "server-only";
import { env } from "@/lib/env";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

type SendEmailInput = {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
};

export type SendEmailResult = { ok: true; messageId?: string; devFallback?: boolean } | { ok: false; error: string };

/**
 * Send a transactional email through Brevo (free tier: 300/day).
 * In development with no BREVO_API_KEY configured, the email is logged to the
 * server console instead so flows remain testable.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = env.brevoApiKey;
  const senderEmail = env.brevoSenderEmail;

  if (!apiKey || !senderEmail) {
    if (env.isProduction) {
      return { ok: false, error: "Email service is not configured." };
    }
    console.info(`\n[email:dev-fallback] To: ${input.to.email}\nSubject: ${input.subject}\n${input.text}\n`);
    return { ok: true, devFallback: true };
  }

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: env.brevoSenderName, email: senderEmail },
        to: [input.to],
        subject: input.subject,
        htmlContent: input.html,
        textContent: input.text,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[brevo] ${res.status} ${body.slice(0, 300)}`);
      return { ok: false, error: "We couldn't send the email right now. Please try again shortly." };
    }
    const data = (await res.json().catch(() => ({}))) as { messageId?: string };
    return { ok: true, messageId: data.messageId };
  } catch (err) {
    console.error("[brevo] network error", err);
    return { ok: false, error: "We couldn't reach the email service. Please try again shortly." };
  }
}
