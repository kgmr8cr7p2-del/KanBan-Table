import { Priority } from "@prisma/client";
import { z } from "zod";

export const aiAssistantRequestSchema = z.object({
  boardId: z.string().min(1).optional(),
  prompt: z.string().trim().min(3, "Задайте вопрос чуть подробнее").max(2400),
});

export const aiAssistantRecommendationSchema = z.object({
  taskId: z.string().trim().min(1),
  taskNumber: z.number().int().nonnegative().optional().default(0),
  title: z.string().trim().max(180).optional().default(""),
  column: z.string().trim().max(120).optional().default(""),
  priority: z.nativeEnum(Priority).optional().default(Priority.MEDIUM),
  deadline: z.string().trim().max(64).nullable().optional().default(null),
  reason: z.string().trim().max(240).default(""),
});

export const aiAssistantResponseSchema = z.object({
  answer: z.string().trim().min(1).max(5000),
  recommendations: z.array(aiAssistantRecommendationSchema).max(6).default([]),
});

export type AiAssistantResponse = z.infer<typeof aiAssistantResponseSchema>;
