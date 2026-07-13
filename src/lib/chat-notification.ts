let audioContext: AudioContext | null = null;

export async function playChatNotification() {
  if (typeof window === "undefined") return;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") await audioContext.resume();
    const start = audioContext.currentTime;
    playTone(audioContext, 660, start, 0.08, 0.055);
    playTone(audioContext, 880, start + 0.1, 0.1, 0.045);
  } catch {
    // Browsers may block audio until the user has interacted with the page.
  }
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
