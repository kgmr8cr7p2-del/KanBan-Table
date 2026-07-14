import nodemailer from "nodemailer";

export class MailDeliveryError extends Error {
  constructor(message = "Не удалось отправить письмо") {
    super(message);
    this.name = "MailDeliveryError";
  }
}

export function assertMailConfigured() {
  if (process.env.NODE_ENV === "production" && !process.env.RESEND_API_KEY && !process.env.SMTP_HOST) {
    throw new MailDeliveryError("Отправка писем временно недоступна");
  }
}

export async function sendVerificationCodeEmail(email: string, code: string) {
  await sendAuthEmail({
    email,
    code,
    subject: "Код подтверждения почты — Taskora",
    heading: "Подтвердите почту",
    description: "Введите этот код на странице регистрации Taskora.",
  });
}

export async function sendPasswordResetCodeEmail(email: string, code: string) {
  await sendAuthEmail({
    email,
    code,
    subject: "Восстановление пароля — Taskora",
    heading: "Восстановление пароля",
    description: "Введите этот код в Taskora, чтобы установить новый пароль.",
    warning: "Если вы не запрашивали восстановление, просто проигнорируйте письмо.",
  });
}

export async function sendPasswordChangedEmail(email: string) {
  await sendMail({
    to: email,
    subject: "Пароль изменён — Taskora",
    text: "Пароль вашей учётной записи Taskora был изменён. Если это сделали не вы, обратитесь к администратору.",
    html: emailLayout(
      "Пароль изменён",
      "Пароль вашей учётной записи Taskora был изменён.",
      "Если это сделали не вы, немедленно обратитесь к администратору.",
    ),
  });
}

async function sendAuthEmail(input: {
  email: string;
  code: string;
  subject: string;
  heading: string;
  description: string;
  warning?: string;
}) {
  const text = [input.heading, input.description, `Код: ${input.code}`, "Код действует 10 минут.", input.warning]
    .filter(Boolean)
    .join("\n\n");
  const codeBlock = `<div style="margin:24px 0;padding:18px 22px;border-radius:12px;background:#f1f4ff;color:#244ac8;font:700 32px/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:8px;text-align:center">${input.code}</div>`;
  const warning = input.warning ? `<p style="margin:18px 0 0;color:#667085;font-size:13px;line-height:1.55">${input.warning}</p>` : "";

  await sendMail({
    to: input.email,
    subject: input.subject,
    text,
    html: emailLayout(input.heading, input.description, `${codeBlock}<p style="margin:0;color:#667085;font-size:13px">Код действует 10 минут.</p>${warning}`),
  });
}

async function sendMail(message: { to: string; subject: string; text: string; html: string }) {
  assertMailConfigured();
  if (process.env.RESEND_API_KEY) {
    await sendWithResend(message);
    return;
  }
  if (!process.env.SMTP_HOST) {
    console.log(`[development email] ${message.to}: ${message.subject}\n${message.text}`);
    return;
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });

  try {
    await transporter.sendMail({
      ...message,
      from: process.env.SMTP_FROM ?? "Taskora <noreply@region-free.online>",
    });
  } catch (error) {
    console.error("SMTP delivery failed", error);
    throw new MailDeliveryError();
  }
}

async function sendWithResend(message: { to: string; subject: string; text: string; html: string }) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...message,
        from: process.env.MAIL_FROM ?? process.env.SMTP_FROM ?? "Taskora <noreply@region-free.online>",
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error(`Resend delivery failed (${response.status}): ${details}`);
      throw new MailDeliveryError();
    }
  } catch (error) {
    if (error instanceof MailDeliveryError) throw error;
    console.error("Resend delivery failed", error);
    throw new MailDeliveryError();
  }
}

function emailLayout(heading: string, description: string, content: string) {
  return `<!doctype html><html lang="ru"><body style="margin:0;background:#f1f4ff;padding:24px;font-family:Arial,sans-serif;color:#111827"><div style="max-width:520px;margin:0 auto;border:1px solid #d9dfeb;border-radius:18px;background:#fff;padding:30px"><div style="margin-bottom:26px;color:#244ac8;font-size:18px;font-weight:800">Taskora</div><h1 style="margin:0 0 12px;font-size:25px;line-height:1.2">${heading}</h1><p style="margin:0 0 18px;color:#475467;line-height:1.6">${description}</p>${content}</div></body></html>`;
}
