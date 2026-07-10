import { PrismaClient, RoleName } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await Promise.all(
    [RoleName.ADMIN, RoleName.MANAGER, RoleName.EXECUTOR].map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  const board = await prisma.board.upsert({
    where: { id: "default-board" },
    update: {},
    create: { id: "default-board", name: "Team Kanban Board" },
  });

  await prisma.oilDepot.upsert({
    where: { id: "default-oil-depot" },
    update: { name: "Не указана", active: true },
    create: { id: "default-oil-depot", name: "Не указана", active: true },
  });

  const columnNames = ["Новые", "В работе", "На проверке", "Готово"];
  for (const [index, name] of columnNames.entries()) {
    await prisma.column.upsert({
      where: { boardId_position: { boardId: board.id, position: index } },
      update: { name },
      create: { name, position: index, boardId: board.id },
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
