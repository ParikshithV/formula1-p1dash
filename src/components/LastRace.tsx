import { StyleSheet, Text, View } from "react-native";
import type { Race, RaceResult } from "../api/types";
import { space, tones, type } from "../theme";
import { CarRender } from "./art/Render";
import { Appear } from "./motion";
import { Field, FieldRow } from "./ui";

const PLACES = ["Winner", "Second", "Third"];

/** Off-white band with the winning team's car, then the podium. Display only – the section header links to results. */
export function LastRace({ race, podium }: { race: Race; podium: RaceResult[] }) {
  const winner = podium[0];
  return (
    <View>
      <Text style={[type.label, styles.caption]}>
        {race.raceName} · Round {race.round}
      </Text>
      <View style={styles.band}>
        {winner ? (
          <Appear>
            <CarRender constructorId={winner.Constructor.constructorId} style={styles.car} />
          </Appear>
        ) : null}
      </View>
      <FieldRow>
        {podium.slice(0, 3).map((r, i) => (
          <Field
            key={r.Driver.driverId}
            label={PLACES[i]}
            value={r.Driver.code ?? r.Driver.familyName.slice(0, 3)}
            sub={r.Time?.time ?? r.status}
          />
        ))}
      </FieldRow>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: { color: tones.dark.muted, marginBottom: space.md },
  band: {
    marginHorizontal: -space.gutter,
    backgroundColor: tones.light.bg,
    justifyContent: "center",
    paddingVertical: space.lg,
    marginBottom: space.xl,
    overflow: "hidden",
  },
  car: { width: "90%", alignSelf: "center" },
});
