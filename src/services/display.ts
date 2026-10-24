import { VIEW } from "../config/view.ts";

export interface DisplayLayout {
  /** Whole-number enlargement in device pixels (spec `viewport.presentation`); 1 when the viewport is smaller than the view. */
  scale: number;
  /** Canvas box in CSS px; left/top go negative when a too-small viewport clips the canvas equally on both sides. */
  cssWidth: number; cssHeight: number; cssLeft: number; cssTop: number;
}

/**
 * k = floor(min(deviceW / 640, deviceH / 360)), never below 1, computed in device pixels so
 * Windows display scaling (DPR 1.25/1.5) still lands on whole device pixels. The offset is
 * floored in device pixels so the canvas edge sits on a device-pixel boundary.
 */
export function displayLayout(deviceWidth: number, deviceHeight: number, devicePixelRatio: number, view: { width: number; height: number } = VIEW): DisplayLayout {
  const scale = Math.max(1, Math.floor(Math.min(deviceWidth / view.width, deviceHeight / view.height)));
  const width = view.width * scale, height = view.height * scale;
  return {
    scale, cssWidth: width / devicePixelRatio, cssHeight: height / devicePixelRatio,
    cssLeft: Math.floor((deviceWidth - width) / 2) / devicePixelRatio, cssTop: Math.floor((deviceHeight - height) / 2) / devicePixelRatio,
  };
}

/** Sizes the canvas from the body's device-pixel box; reacts to resize, fullscreen and DPR changes. Returns the uninstaller. */
export function installDisplay(canvas: HTMLCanvasElement): () => void {
  const host = document.body;
  let device: { width: number; height: number } | undefined;
  const apply = () => {
    const ratio = window.devicePixelRatio || 1, rect = host.getBoundingClientRect();
    const width = device?.width ?? Math.round(rect.width * ratio), height = device?.height ?? Math.round(rect.height * ratio);
    const layout = displayLayout(width, height, ratio);
    Object.assign(canvas.style, { width: `${layout.cssWidth}px`, height: `${layout.cssHeight}px`, left: `${layout.cssLeft}px`, top: `${layout.cssTop}px` });
    canvas.dataset.scale = String(layout.scale);
  };
  // device-pixel-content-box gives exact device pixels (and fires on DPR changes) where supported.
  const observer = new ResizeObserver((entries) => {
    const box = entries[0]?.devicePixelContentBoxSize?.[0];
    device = box ? { width: box.inlineSize, height: box.blockSize } : undefined;
    apply();
  });
  try { observer.observe(host, { box: "device-pixel-content-box" }); } catch { observer.observe(host); }
  let media: MediaQueryList | undefined;
  const watchRatio = () => { media?.removeEventListener("change", onRatio); media = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`); media.addEventListener("change", onRatio); };
  const onRatio = () => { watchRatio(); apply(); };
  watchRatio();
  window.addEventListener("resize", apply);
  document.addEventListener("fullscreenchange", apply);
  apply();

  const focus = () => canvas.focus({ preventScroll: true });
  const keyboard = (event: KeyboardEvent) => {
    if (event.code !== "KeyF" || event.repeat) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
  };
  const pointer = () => focus();
  window.addEventListener("keydown", keyboard);
  canvas.addEventListener("pointerdown", pointer);
  focus();
  return () => {
    observer.disconnect(); media?.removeEventListener("change", onRatio);
    window.removeEventListener("resize", apply);
    document.removeEventListener("fullscreenchange", apply);
    window.removeEventListener("keydown", keyboard);
    canvas.removeEventListener("pointerdown", pointer);
  };
}
