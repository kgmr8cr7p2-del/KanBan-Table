import { z } from "zod";

export const aiAssistantRequestSchema = z.object({
  boardId: z.string().min(1).optional(),
  prompt: z.string().trim().min(3, "Задайте вопрос чуть подробнее").max(2400),
});

export const aiAssistantResponseSchema = z.object({
  answer: z.string().trim().min(1).max(5000),
});

export type AiAssistantResponse = z.infer<typeof aiAssistantResponseSchema>;
