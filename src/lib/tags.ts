import { prisma } from "@/lib/prisma";

export async function tagConnects(names: string[]) {
  return Promise.all(
    [...new Set(names.map((name) => name.trim()).filter(Boolean))].map(async (name) => {
      const tag = await prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name, color: tagColor(name) },
      });
      return { tagId: tag.id };
    }),
  );
}

function tagColor(value: string) {
  const colors = ["#0c66e4", "#1f845a", "#b38600", "#c9372c", "#6e5dc6", "#ae4787"];
  const index = [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
}
