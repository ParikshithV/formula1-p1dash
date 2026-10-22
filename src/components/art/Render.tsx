import { memo } from "react";
import { Image, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { F1_CARS, F1_DRIVERS, F1_RATIOS, F1_TRACKS } from "../../lib/f1art.generated";
import { CAR_RENDERS, FLAG_RENDER, HELMET_RENDERS, RENDER_RATIOS, TRACK_RENDERS } from "../../lib/renders.generated";

// Artwork is built from formula1.com imagery (scripts/render-assets/f1.mjs), falling back to
// original 3D renders (render.mjs) where F1 has none. Each component reserves the image's
// true aspect ratio, so callers only set a width or a height.

type Props = { style?: StyleProp<ViewStyle> };

/**
 * The aspect ratio lives on a wrapping view: React Native Web ignores `aspectRatio` on
 * images and falls back to the file's natural height, which breaks percentage widths.
 */
function Framed({ source, aspectRatio, label, style }: { source: ImageSourcePropType; aspectRatio: number; label: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ aspectRatio }, style]} accessibilityLabel={label} accessibilityRole="image">
      <Image source={source} resizeMode="contain" style={styles.fill} />
    </View>
  );
}

const ratio = (key: string, fallback: number) => RENDER_RATIOS[key] ?? fallback;
const f1Ratio = (key: string, fallback: number) => F1_RATIOS[key] ?? fallback;

/** Aspect ratio (width / height) of a circuit image; 1.4 if there isn't one. */
export const trackRenderRatio = (circuitId: string) =>
  F1_TRACKS[circuitId] ? f1Ratio(`tracks/${circuitId}`, 1.4) : ratio(`tracks/${circuitId}`, 1.4);

function CarRenderBase({ constructorId, style }: Props & { constructorId: string }) {
  const f1 = F1_CARS[constructorId];
  if (f1) return <Framed source={f1} aspectRatio={f1Ratio(`cars/${constructorId}`, 4)} label="Car" style={style} />;
  const source = CAR_RENDERS[constructorId];
  if (!source) return null;
  return <Framed source={source} aspectRatio={ratio(`cars/${constructorId}`, 2.2)} label="Car render" style={style} />;
}

/** Driver portrait as a single-ink print in the team colour; falls back to the team's helmet render. */
function DriverRenderBase({ driverId, constructorId, style }: Props & { driverId?: string; constructorId: string }) {
  const f1 = driverId ? F1_DRIVERS[driverId] : undefined;
  if (f1) return <Framed source={f1} aspectRatio={f1Ratio(`drivers/${driverId}`, 0.9)} label="Driver" style={style} />;
  const key = driverId && HELMET_RENDERS[driverId] ? driverId : `team-${constructorId}`;
  const source = HELMET_RENDERS[key];
  if (!source) return null;
  return <Framed source={source} aspectRatio={ratio(`helmets/${key}`, 1)} label="Helmet render" style={style} />;
}

/** The circuit image itself (F1's, else the 3D render), e.g. to blur behind glass. */
export const trackSource = (circuitId: string): ImageSourcePropType | undefined => F1_TRACKS[circuitId] ?? TRACK_RENDERS[circuitId];

function TrackRenderBase({ circuitId, style }: Props & { circuitId: string }) {
  const f1 = F1_TRACKS[circuitId];
  if (f1) return <Framed source={f1} aspectRatio={f1Ratio(`tracks/${circuitId}`, 1.6)} label="Circuit map" style={style} />;
  const source = TRACK_RENDERS[circuitId];
  if (!source) return null;
  return <Framed source={source} aspectRatio={ratio(`tracks/${circuitId}`, 1.4)} label="Circuit render" style={style} />;
}

function FlagRenderBase({ style }: Props) {
  return <Framed source={FLAG_RENDER} aspectRatio={ratio("misc/flag", 1.8)} label="Chequered flag" style={style} />;
}

export const CarRender = memo(CarRenderBase);
export const DriverRender = memo(DriverRenderBase);
export const TrackRender = memo(TrackRenderBase);
export const FlagRender = memo(FlagRenderBase);

const styles = StyleSheet.create({
  fill: { width: "100%", height: "100%" },
});
