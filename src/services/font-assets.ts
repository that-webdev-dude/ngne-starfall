import type { ImageAsset } from "@ngne/core";
import { REV01_URLS, derivedImageAsset, maskPixels } from "./rev01-assets.ts";

/** Texture id of the font mask; every glyph quad (ui/bitmap-text.ts) uses it. */
export const FONT_MASK_TEXTURE = "rev01-font-mask";

/**
 * T4-owned font hook. The single source of the font image every claim and renderer uses: stage and screen claims
 * both call `fontImage()`, and `rev01Image("font")` refuses, so a raw and a masked font can never both be claimed.
 * The strip (all glyphs in ui[2]) is turned into a white mask at load (`maskPixels`, alpha kept), so a glyph quad
 * tinted with a `presentation.textColors` entry reproduces that colour exactly. Defining the asset never loads it.
 */
let font: ImageAsset | undefined;
export function fontImage(): ImageAsset {
  return font ??= derivedImageAsset(FONT_MASK_TEXTURE, REV01_URLS.font, maskPixels);
}
