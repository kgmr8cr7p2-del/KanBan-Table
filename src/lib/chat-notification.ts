let audioContext: AudioContext | null = null;
const audioBufferCache = new Map<string, Promise<AudioBuffer>>();
const SOUND_KEY = "taskora-notification-sound";
const VOLUME_KEY = "taskora-notification-volume-v3";

export type NotificationSoundResult = "played" | "disabled" | "blocked" | "failed";

export function isNotificationSoundEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SOUND_KEY) !== "off";
}

export function getNotificationSoundVolume() {
  if (typeof window === "undefined") return 1;
  const storedValue = window.localStorage.getItem(VOLUME_KEY);
  if (storedValue === null) return 1;
  const value = Number(storedValue);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : 1;
}

export function setNotificationSoundPreferences(enabled: boolean, volume: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
  window.localStorage.setItem(VOLUME_KEY, String(Math.min(1, Math.max(0, volume))));
}

export async function primeNotificationSound() {
  if (typeof window === "undefined" || !isNotificationSoundEnabled()) return false;
  audioContext ??= new AudioContext();
  if (audioContext.state === "suspended") await audioContext.resume().catch(() => undefined);
  return audioContext.state === "running";
}

export async function playChatNotification(kind: "chat" | "mention" = "chat"): Promise<NotificationSoundResult> {
  if (typeof window === "undefined") return "failed";
  if (!isNotificationSoundEnabled()) return "disabled";
  try {
    const ready = await primeNotificationSound();
    if (!ready || !audioContext) return "blocked";
    const start = audioContext.currentTime;
    const volume = getNotificationSoundVolume();
    const first = kind === "mention" ? 880 : 660;
    const second = kind === "mention" ? 1046 : 880;
    playTone(audioContext, first, start, 0.08, volume);
    playTone(audioContext, second, start + 0.1, 0.1, volume * 0.8);
    return "played";
  } catch {
    return audioContext?.state === "running" ? "failed" : "blocked";
  }
}

export async function playNotificationSoundFile(soundUrl: string): Promise<NotificationSoundResult> {
  if (typeof window === "undefined") return "failed";
  if (!isNotificationSoundEnabled()) return "disabled";

  try {
    const ready = await primeNotificationSound();
    if (!ready || !audioContext) return "blocked";
    const context = audioContext;
    const buffer = await loadAudioBuffer(context, soundUrl);
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
