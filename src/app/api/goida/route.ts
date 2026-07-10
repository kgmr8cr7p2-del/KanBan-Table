import { requireVerifiedUser } from "@/lib/auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { getLatestGoidaEvent, triggerGoidaEvent } from "@/lib/goida-event";

const GOIDA_TEST_EMAIL = "les_victor@mail.ru";

export async function GET() {
  try {
    await requireVerifiedUser();
    return ok({ event: getLatestGoidaEvent() });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST() {
  try {
    const user = await requireVerifiedUser();
    if (user.email.toLowerCase() !== GOIDA_TEST_EMAIL) return fail("Недостаточно прав", 403);
    return ok({ event: triggerGoidaEvent() });
  } catch (error) {
    return handleRouteError(error);
  }
}
