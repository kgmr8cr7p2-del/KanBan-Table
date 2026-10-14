import { defaultSoundPreferences, parseSoundPreferences, shouldPlaySound, type SoundCategory, type SoundPreferences } from "@/lib/sound-preferences";

let preferenceUser = "";
let preferencesReady = false;
let memoryPreferences: SoundPreferences = { ...defaultSoundPreferences };
let audioContext: AudioContext | null = null;
const audioBufferCache = new Map<string, Promise<AudioBuffer>>();
export function setSoundPreferenceUser(userId: string) {
  preferenceUser = userId;
  try { const stored = window.localStorage.getItem(`taskora-sounds:${userId}`); memoryPreferences = parseSoundPreferences(JSON.parse(stored || "null")); preferencesReady = Boolean(stored); }
  catch { memoryPreferences = { ...defaultSoundPreferences }; preferencesReady = false; }
}
export function getSoundPreferences() { return { ...memoryPreferences }; }
export function cacheSoundPreferences(value: unknown) {
  memoryPreferences = parseSoundPreferences(value);
  preferencesReady = true;
  try { if (preferenceUser) window.localStorage.setItem(`taskora-sounds:${preferenceUser}`, JSON.stringify(memoryPreferences)); }
  catch { /* Settings still apply in this tab. */ }
  window.dispatchEvent(new Event("soundpreferenceschange"));
}

export type NotificationSoundResult = "played" | "disabled" | "blocked" | "failed";

export function isNotificationSoundEnabled() {
  return typeof window !== "undefined" && memoryPreferences.enabled;
}

export function getNotificationSoundVolume() {
  return memoryPreferences.volume;
}

export function setNotificationSoundPreferences(enabled: boolean, volume: number) {
  cacheSoundPreferences({ ...memoryPreferences, enabled, volume });
}

export async function primeNotificationSound(force = false) {
  if (typeof window === "undefined" || (!force && !isNotificationSoundEnabled())) return false;
  audioContext ??= new AudioContext();
  if (audioContext.state === "suspended") await audioContext.resume().catch(() => undefined);
  return audioContext.state === "running";
}

export async function playChatNotification(kind: "chat" | "mention" = "chat", preview?: SoundPreferences): Promise<NotificationSoundResult> {
  if (typeof window === "undefined") return "failed";
  if (!preferencesReady && !preview) return "blocked";
  const preferences = preview ?? memoryPreferences;
  if (!shouldPlaySound(preferences, kind)) return "disabled";
  try {
    const ready = await primeNotificationSound(Boolean(preview));
    if (!ready || !audioContext) return "blocked";
    const start = audioContext.currentTime;
    const volume = preferences.volume;
    const first = kind === "mention" ? 880 : 660;
    const second = kind === "mention" ? 1046 : 880;
    playTone(audioContext, first, start, 0.08, volume);
    playTone(audioContext, second, start + 0.1, 0.1, volume * 0.8);
    return "played";
  } catch {
    return audioContext?.state === "running" ? "failed" : "blocked";
  }
}

export async function playNotificationSoundFile(soundUrl: string, category: SoundCategory = "created"): Promise<NotificationSoundResult> {
  if (typeof window === "undefined") return "failed";
  if (!preferencesReady) return "blocked";
  if (!shouldPlaySound(memoryPreferences, category)) return "disabled";

  try {
    const ready = await primeNotificationSound();
    if (!ready || !audioContext) return "blocked";
    const context = audioContext;
    const buffer = await loadAudioBuffer(context, soundUrl);
    if (!shouldPlaySound(memoryPreferences, category)) return "disabled";
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = getNotificationSoundVolume();
    source.connect(gain);
    gain.connect(context.destination);

    return await new Promise<NotificationSoundResult>((resolve) => {
      source.addEventListener("ended", () => resolve("played"), { once: true });
      try {
        source.start(0);
      } catch {
        resolve("failed");
      }
    });
  } catch {
    audioBufferCache.delete(soundUrl);
    return audioContext?.state === "running" ? "failed" : "blocked";
  }
}

function loadAudioBuffer(context: AudioContext, soundUrl: string) {
  const cached = audioBufferCache.get(soundUrl);
  if (cached) return cached;
  const loading = fetch(soundUrl, { cache: "force-cache" }).then(async (response) => {
    if (!response.ok) throw new Error(`Sound request failed: ${response.status}`);
    return context.decodeAudioData(await response.arrayBuffer());
  });
  audioBufferCache.set(soundUrl, loading);
  return loading;
}

function playTone(context: AudioContext, frequency: number, start: number, duration: number, volume: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}
