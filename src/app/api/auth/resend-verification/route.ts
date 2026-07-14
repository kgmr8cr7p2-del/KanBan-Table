import { prisma } from "@/lib/prisma";
import { AuthCodeCooldownError, issueVerificationCode } from "@/lib/email-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { assertMailConfigured, MailDeliveryError } from "@/lib/mail";
import { resendVerificationSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    assertMailConfigured();
    const input = resendVerificationSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (user && !user.emailVerifiedAt) await issueVerificationCode(user.id, user.email);
    return ok({ ok: true });
  } catch (error) {
    if (error instanceof AuthCodeCooldownError) return fail(error.message, 429);
    if (error instanceof MailDeliveryError) return fail(error.message, 503);
    return handleRouteError(error);
  }
}
