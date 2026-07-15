import { BoardTvClient } from "@/components/BoardTvClient";
import { PermissionKey } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { getBoardView } from "@/lib/board-data";
import { getTvNews } from "@/lib/tv-news";

export default async function BoardTvPage() {
  const user = await requirePermission(PermissionKey.VIEW_BOARD);
  const view = await getBoardView(user);
  const serializable = JSON.parse(JSON.stringify(view));
  const initialNews = await getTvNews().catch(() => null);

  return <BoardTvClient initialView={serializable} initialNews={initialNews} />;
}
