import { requireAccountUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/http";
import { INTERFACE_MODE_COOKIE, normalizeInterfaceMode, type InterfaceMode } from "@/lib/interface-mode";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const interfaceModeSchema = z.object({ mode: z.enum(["classic", "new"]) });

export async function GET() {
  try {
    const user = await requireAccountUser();
    return ok({ interfaceMode: normalizeInterfaceMode(user.interfaceMode) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAccountUser();
    const input = interfaceModeSchema.parse(await request.json());
    const mode = input.mode as InterfaceMode;
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { interfaceMode: mode },
      select: { interfaceMode: true },
    });
    const response = ok({ interfaceMode: normalizeInterfaceMode(updated.interfaceMode) });
    response.cookies.set(INTERFACE_MODE_COOKIE, mode, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
