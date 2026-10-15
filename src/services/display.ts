export function installDisplay(canvas: HTMLCanvasElement): () => void {
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
    window.removeEventListener("keydown", keyboard);
    canvas.removeEventListener("pointerdown", pointer);
  };
}
