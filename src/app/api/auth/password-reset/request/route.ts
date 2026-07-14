import { prisma } from "@/lib/prisma";
import { AuthCodeCooldownError, issuePasswordResetCode } from "@/lib/email-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { assertMailConfigured, MailDeliveryError } from "@/lib/mail";
import { passwordResetRequestSchema } from "@/lib/validators";

const genericMessage = "Если аккаунт с такой почтой существует, код уже отправлен.";

export async function POST(request: Request) {
  try {
    assertMailConfigured();
    const input = passwordResetRequestSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (user?.emailVerifiedAt) {
      try {
        await issuePasswordResetCode(user.id, user.email);
      } catch (error) {
        if (!(error instanceof AuthCodeCooldownError)) throw error;
      }
    }
    return ok({ ok: true, message: genericMessage });
  } catch (error) {
    if (error instanceof MailDeliveryError) return fail(error.message, 503);
    return handleRouteError(error);
  }
}
