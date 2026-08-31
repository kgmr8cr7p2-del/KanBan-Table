import { Priority } from "@prisma/client";
import { z } from "zod";

export const aiTaskDraftRequestSchema = z.object({
  boardId: z.string().min(1).optional(),
  prompt: z.string().trim().min(8, "Опишите задачу чуть подробнее").max(4000),
});

export const aiTaskDraftSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(4000).default(""),
  prioritySuggestion: z.nativeEnum(Priority).nullable().default(null),
  priorityReason: z.string().trim().max(220).default(""),
  oilDepotId: z.string().trim().nullable().default(null),
  assigneeIds: z.array(z.string().trim()).max(5).default([]),
  existingTags: z.array(z.string().trim().min(1).max(32)).max(8).default([]),
  newTags: z.array(z.string().trim().min(1).max(32)).max(5).default([]),
  checklist: z.array(z.string().trim().min(1).max(240)).max(5).default([]),
  deadlineHint: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(280).default(""),
});

export type AiTaskDraft = z.infer<typeof aiTaskDraftSchema>;

export function isAiTaskDraftEnabled() {
  return process.env.AI_PROVIDER?.trim().toLowerCase() === "deepseek" && Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

export function deepSeekModel() {
  return process.env.DEEPSEEK_MODEL?.trim() || "deepseek-v4-flash";
}

