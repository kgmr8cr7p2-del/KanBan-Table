import { PermissionKey } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { getTvNews } from "@/lib/tv-news";

export const dynamic = "force-dynamic";

export async function GET() {
  await requirePermission(PermissionKey.VIEW_BOARD);

  try {
    const news = await getTvNews();
    return NextResponse.json(news, {
      headers: { "cache-control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    console.error("TV news refresh failed", error);
    return NextResponse.json(
      { error: "Новости временно недоступны" },
      { status: 503, headers: { "cache-control": "private, no-store, max-age=0" } },
    );
  }
}
