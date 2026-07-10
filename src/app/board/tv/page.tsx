import { BoardTvClient } from "@/components/BoardTvClient";
import { requireVerifiedUser } from "@/lib/auth";
import { getBoardView } from "@/lib/board-data";

export default async function BoardTvPage() {
  const user = await requireVerifiedUser();
  const view = await getBoardView(user);
  const serializable = JSON.parse(JSON.stringify(view));

  return <BoardTvClient initialView={serializable} />;
}
