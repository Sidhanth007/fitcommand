import "server-only";
import { env } from "@/lib/env";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function shell(title: string, bodyHtml: string) {
  const app = escapeHtml(env.appName);
  return `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:14px;padding:32px;border:1px solid #e5e7eb">
        <tr><td style="font-size:18px;font-weight:700;color:#059669;padding-bottom:16px">${app}</td></tr>
        <tr><td style="font-size:20px;font-weight:600;padding-bottom:8px">${escapeHtml(title)}</td></tr>
        <tr><td style="font-size:15px;line-height:1.6;color:#374151">${bodyHtml}</td></tr>
        <tr><td style="padding-top:24px;font-size:12px;color:#6b7280;line-height:1.5">
          ${app} is an AI-powered informational demo and not a substitute for professional medical or nutrition advice.
          If you didn't request this email you can safely ignore it.
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

function codeBlock(code: string) {
  return `<div style="margin:20px 0;text-align:center"><span style="display:inline-block;font-size:32px;letter-spacing:10px;font-weight:700;padding:14px 22px;border-radius:10px;background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0">${escapeHtml(code)}</span></div>`;
}

export function verifyEmailTemplate(name: string, code: string) {
  const subject = `${env.appName}: your verification code is ${code}`;
  const html = shell(
    "Verify your email",
    `<p>Hi ${escapeHtml(name)},</p><p>Enter this code to verify your email address. It expires in <strong>10 minutes</strong>.</p>${codeBlock(code)}<p>Welcome aboard — your personalized command center is one step away.</p>`,
  );
  const text = `Hi ${name},\n\nYour ${env.appName} verification code is: ${code}\nIt expires in 10 minutes.\n\nIf you didn't request this, ignore this email.`;
  return { subject, html, text };
}

export function resetPasswordTemplate(name: string, code: string) {
  const subject = `${env.appName}: password reset code ${code}`;
  const html = shell(
    "Reset your password",
    `<p>Hi ${escapeHtml(name)},</p><p>Use this code to reset your password. It expires in <strong>10 minutes</strong>.</p>${codeBlock(code)}<p>If you didn't ask to reset your password, no action is needed — your account stays secure.</p>`,
  );
  const text = `Hi ${name},\n\nYour ${env.appName} password reset code is: ${code}\nIt expires in 10 minutes.\n\nIf you didn't request this, ignore this email.`;
  return { subject, html, text };
}
