import nodemailer from "nodemailer";

export async function sendVerificationEmail(email: string, token: string) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const link = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;

  if (!process.env.SMTP_HOST) {
    console.log(`[email verification] ${email}: ${link}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  await transporter.sendMail({
    to: email,
    from: process.env.SMTP_FROM ?? "Taskora <noreply@example.com>",
    subject: "Подтвердите почту в Taskora",
    text: `Откройте ссылку для подтверждения почты: ${link}`,
    html: `<p>Откройте ссылку для подтверждения почты:</p><p><a href="${link}">${link}</a></p>`,
  });
}
