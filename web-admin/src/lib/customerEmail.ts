import nodemailer, { type Transporter } from 'nodemailer';

let transporter: Transporter | null | undefined;

function mailer() {
  if (transporter !== undefined) return transporter;
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return (transporter = null);
  const port = Number(process.env.SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export function isCustomerEmailAvailable() { return Boolean(process.env.SMTP_HOST?.trim()); }

export async function sendCustomerOtp(input: { to: string; code: string; purpose: 'verify_email' | 'password_reset' }) {
  const active = mailer();
  if (!active) return false;
  const title = input.purpose === 'verify_email' ? 'Xác minh email' : 'Đặt lại mật khẩu';
  await active.sendMail({
    from: process.env.SMTP_FROM || 'TrucTiepGAME <no-reply@hacom.vn>',
    to: input.to,
    subject: `${title} tài khoản TrucTiepGAME`,
    text: `Mã ${title.toLowerCase()} của bạn là ${input.code}. Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai.`,
    html: `<main style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;color:#0f172a"><h1 style="font-size:22px">${title}</h1><p>Mã xác thực của bạn:</p><p style="font-size:32px;letter-spacing:8px;font-weight:700;color:#2563eb">${input.code}</p><p>Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai.</p></main>`,
  });
  return true;
}
