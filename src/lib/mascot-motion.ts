export type MascotPoint = { x: number; y: number };
export type MascotPlatform = MascotPoint & { width: number };
// Feet baseline in the rendered 112 x 149 sprite, excluding transparent padding.
export const MASCOT_FOOT_Y = 125;

export function planMascotMotion(
  start: MascotPoint,
  viewport: { width: number; height: number },
  platforms: MascotPlatform[],
  step: number,
  random = Math.random,
) {
  const maxX = Math.max(8, viewport.width - 132);
  const maxY = Math.max(8, viewport.height - 220);
  const outside = start.x < -120 || start.x > viewport.width;
  const exiting = !outside && step % 5 === 4;
  const platform = platforms.length ? platforms[Math.floor(random() * platforms.length)] : null;
  const kind = outside ? "return" : exiting ? "exit" : platform && step % 3 !== 0 ? "jump" : "run";
  const target = exiting
    ? { x: start.x < viewport.width / 2 ? -160 : viewport.width + 40, y: Math.min(maxY, Math.max(8, start.y)) }
    : kind === "jump" || kind === "return" ? {
      x: Math.max(8, Math.min(maxX, platform ? platform.x + platform.width / 2 - 56 : maxX / 2)),
      y: Math.max(8, Math.min(maxY, platform ? platform.y - MASCOT_FOOT_Y : maxY / 2)),
    } : { x: 8 + random() * Math.max(0, maxX - 8), y: 8 + random() * Math.max(0, maxY - 8) };
  const distance = Math.hypot(target.x - start.x, target.y - start.y);
  const jumping = kind === "jump" || kind === "return";
  const arc = Math.min(160, Math.max(48, distance / 3));
  const keyframes = Array.from({ length: jumping ? 13 : 2 }, (_, index) => {
    const progress = index / (jumping ? 12 : 1);
    const x = start.x + (target.x - start.x) * progress;
    const y = Math.max(0, start.y + (target.y - start.y) * progress - (jumping ? Math.sin(progress * Math.PI) * arc : 0));
    return { transform: `translate(${Math.round(x)}px,${Math.round(y)}px)`, offset: progress };
  });
  return { kind, target, keyframes, duration: jumping ? Math.min(1600, Math.max(650, distance * 2)) : Math.min(3500, Math.max(1000, distance * 6)) };
}
