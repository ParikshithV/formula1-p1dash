import { useWindowDimensions } from "react-native";
import { layout, space } from "../theme";

/**
 * Responsive frame. Content is capped at `layout.maxWidth` and centred on tablets and
 * desktop web; on narrow phones display type scales down so mono lines still fit.
 */
export function useLayout() {
  const { width } = useWindowDimensions();
  const frame = Math.min(width, layout.maxWidth);
  const scale = Math.max(0.78, Math.min(1, frame / layout.designWidth));
  return {
    width,
    /** Width of the centred content column, including gutters. */
    frame,
    /** Usable text width inside the gutters. */
    inner: frame - space.gutter * 2,
    compact: frame < 375,
    scale,
    /** Scale a design-size number (font size, column width) to this screen. */
    fit: (n: number) => Math.round(n * scale),
  };
}

/** Share Tech Mono advance per character (font-size fraction) with headroom for letter-spacing. */
const MONO_CHAR = 0.55;

/** Largest mono font size (≤ `max`) at which `text` fits on one line within `width`. */
export const fitMono = (text: string, width: number, max: number) => Math.min(max, width / (Math.max(text.length, 1) * MONO_CHAR));
