import { StyleSheet, Text, View } from "react-native";
import type { DriverStanding } from "../api/types";
import { teamColor, teamMeta } from "../lib/assets";
import { fonts, space, tones, type } from "../theme";
import { DriverRender } from "./art/Render";
import { Appear } from "./motion";
import { Field, FieldRow } from "./ui";

interface Props {
  standing: DriverStanding;
  constructorId: string;
  leaderPoints: number;
}

/** Followed driver: dark band with the race number set large behind the driver's portrait. */
export function DriverSpotlight({ standing, constructorId, leaderPoints }: Props) {
  const gap = leaderPoints - Number(standing.points);
  return (
    <View>
      <View style={styles.band}>
        <Text style={styles.number}>{standing.Driver.permanentNumber}</Text>
        <Appear style={styles.helmetWrap}>
          <DriverRender driverId={standing.Driver.driverId} constructorId={constructorId} style={styles.helmet} />
        </Appear>
        <View style={styles.name}>
          <View style={styles.teamRow}>
            <View style={[styles.swatch, { backgroundColor: teamColor(constructorId) }]} />
            <Text style={[type.label, { color: tones.dark.muted }]}>{teamMeta(constructorId).shortName}</Text>
          </View>
          <Text style={[type.body, { color: tones.dark.muted }]}>{standing.Driver.givenName}</Text>
          <Text style={[type.heading, styles.family]}>{standing.Driver.familyName}</Text>
        </View>
      </View>
      <FieldRow>
        <Field label="Position" value={`P${standing.positionText}`} />
        <Field label="Points" value={standing.points} />
        <Field label="Wins" value={standing.wins} />
        <Field label="To leader" value={gap === 0 ? "—" : `-${gap}`} />
      </FieldRow>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    marginHorizontal: -space.gutter,
    height: 220,
    backgroundColor: tones.dark.band,
    marginBottom: space.xl,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  number: {
    position: "absolute",
    left: space.gutter - 6,
    top: -18,
    fontFamily: fonts.mono,
    fontSize: 170,
    lineHeight: 190,
    color: "#262626",
  },
  helmetWrap: { position: "absolute", right: space.md, bottom: 0 },
  helmet: { height: 195 },
  name: { padding: space.gutter, gap: 2, maxWidth: "62%" },
  teamRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: space.sm },
  swatch: { width: 8, height: 8 },
  family: { color: tones.dark.text, textTransform: "uppercase" },
});
