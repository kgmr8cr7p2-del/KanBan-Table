ALTER TABLE "Task" ADD COLUMN "reminderDaysBefore" INTEGER;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_reminderDaysBefore_check"
CHECK ("reminderDaysBefore" IS NULL OR "reminderDaysBefore" BETWEEN 0 AND 30);

-- Older builds registered the shared channel as every user's personal chat.
-- Personal reminders must only use chats explicitly connected through the bot.
DELETE FROM "TelegramConnection" WHERE "chatId" = '-5575713442';
