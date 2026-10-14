import { z } from "zod";

export const soundPreferenceSchema = z.object({
  enabled: z.boolean(),
  volume: z.number().min(0).max(1),
  chat: z.boolean(),
  mention: z.boolean(),
  created: z.boolean(),
  completed: z.boolean(),
  reminder: z.boolean(),
  prank: z.boolean().default(true),
  mascotEnabled: z.boolean().default(true),
  quietEnabled: z.boolean(),
  quietFrom: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  quietTo: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});
export type SoundPreferences = z.infer<typeof soundPreferenceSchema>;
export type SoundCategory = "chat" | "mention" | "created" | "completed" | "reminder" | "prank";
export const defaultSoundPreferences: SoundPreferences = {
  enabled: true, volume: 1, chat: true, mention: true, created: true, completed: true, reminder: true,
  prank: true, mascotEnabled: true,
  quietEnabled: false, quietFrom: "22:00", quietTo: "08:00",
};
export function parseSoundPreferences(value: unknown): SoundPreferences {
  const result = soundPreferenceSchema.safeParse(value);
  return result.success ? result.data : { ...defaultSoundPreferences };
}
export function isQuietTime(preferences: SoundPreferences, now = new Date()) {
  if (!preferences.quietEnabled || preferences.quietFrom === preferences.quietTo) return false;
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  return preferences.quietFrom < preferences.quietTo
    ? time >= preferences.quietFrom && time < preferences.quietTo
    : time >= preferences.quietFrom || time < preferences.quietTo;
}
export function shouldPlaySound(preferences: SoundPreferences, category: SoundCategory, now = new Date()) {
  return preferences.enabled && preferences.volume > 0 && preferences[category] && !isQuietTime(preferences, now);
}
