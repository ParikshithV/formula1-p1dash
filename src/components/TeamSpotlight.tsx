import { StyleSheet, Text, View } from "react-native";
import type { ConstructorStanding } from "../api/types";
import { teamColor } from "../lib/assets";
import { space, tones, type } from "../theme";
import { CarRender } from "./art/Render";
import { Appear } from "./motion";
import { Field, FieldRow } from "./ui";

/** Followed team: 3D car render on a dark band edged in the team colour, then the constructors' numbers. */
export function TeamSpotlight({ standing, leaderPoints }: { standing: ConstructorStanding; leaderPoints: number }) {
  const { constructorId, name } = standing.Constructor;
  const gap = leaderPoints - Number(standing.points);
  return (
    <View>
      <View style={[styles.band, { borderTopColor: teamColor(constructorId) }]}>
        <Text style={[type.heading, styles.name, { color: teamColor(constructorId) }]}>{name}</Text>
        <Appear>
          <CarRender constructorId={constructorId} style={styles.car} />
        </Appear>
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
    paddingTop: space.lg,
    marginBottom: space.xl,
    overflow: "hidden",
    backgroundColor: tones.dark.band,
    borderTopWidth: 4,
  },
  name: { textTransform: "uppercase", paddingHorizontal: space.gutter },
  car: { width: "92%", alignSelf: "center", marginVertical: space.lg },
});
