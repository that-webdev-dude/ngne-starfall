import type { Settings } from "../world/session.ts";
export function loadSettings(): Settings {
  const defaults: Settings = { music: 0.55, effects: 0.7, muted: false, reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches };
  try {
    const saved = JSON.parse(localStorage.getItem("starfall.settings") ?? "{}");
    for (const key of ["music", "effects"] as const) if (typeof saved[key] === "number" && Number.isFinite(saved[key])) defaults[key] = Math.max(0, Math.min(1, saved[key]));
    for (const key of ["muted", "reducedMotion"] as const) if (typeof saved[key] === "boolean") defaults[key] = saved[key];
  } catch {}
  return defaults;
}
export function saveSettings(settings: Settings): void { try { localStorage.setItem("starfall.settings", JSON.stringify(settings)); } catch {} }
export function loadBest(): number { try { const score = Number(localStorage.getItem("starfall.best")); return Number.isFinite(score) ? Math.max(0, score) : 0; } catch { return 0; } }
export function saveBest(best: number): void { try { localStorage.setItem("starfall.best", String(best)); } catch {} }
