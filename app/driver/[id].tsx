import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DriverRender } from "../../src/components/art/Render";
import { Appear, PressableScale, useScrollY } from "../../src/components/motion";
import { resolveTeam } from "../../src/components/StandingRows";
import { TopBar, useTopBarSpace } from "../../src/components/TopBar";
import {
  BigTitle,
  EmptyState,
  ErrorState,
  Field,
  FieldRow,
  PillButton,
  RowAffordance,
  SectionHeader,
  Skeleton,
} from "../../src/components/ui";
import { useCurrentTeams, useDriverResults, useDriverStandings } from "../../src/hooks/queries";
import { useFavoriteDriver } from "../../src/hooks/usePreferences";
import { nationalityFlag, teamColor, teamMeta } from "../../src/lib/assets";
import { shortRaceName } from "../../src/lib/race";
import { fonts, frameStyle, space, tones, type } from "../../src/theme";

const t = tones.light;

/** Driver profile: season numbers, a follow toggle and every round's result. */
export default function DriverScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const top = useTopBarSpace();
  const { scrollY, onScroll } = useScrollY();
  const standings = useDriverStandings();
  const teams = useCurrentTeams();
  const results = useDriverResults(id);
  const { favoriteDriverId, toggleFavorite } = useFavoriteDriver();

  const list = standings.data?.standings ?? [];
  const standing = list.find((s) => s.Driver.driverId === id);
  const driver = standing?.Driver ?? results.data?.[0]?.result.Driver;
  const team = standing ? resolveTeam(standing, teams.data) : results.data?.at(-1)?.result.Constructor.constructorId ?? "";
  const leaderPoints = Number(list[0]?.points ?? 0);
  const races = results.data ?? [];
  const podiums = races.filter((r) => Number(r.result.position) <= 3).length;
  const best = races.reduce((min, r) => Math.min(min, Number(r.result.position) || Infinity), Infinity);
  const following = favoriteDriverId === id;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, frameStyle, { paddingTop: top, paddingBottom: insets.bottom + space.section }]}
      >
        <PillButton
          tone="light"
          label="Back"
          icon="chevron-back"
          iconPosition="start"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/standings"))}
          style={styles.back}
        />

        {!driver ? (
          standings.isError ? (
            <ErrorState tone="light" onRetry={() => standings.refetch()} />
          ) : (
            <View style={styles.skeleton}>
              <Skeleton tone="light" height={70} />
              <Skeleton tone="light" height={240} />
            </View>
          )
        ) : (
          <>
            <BigTitle tone="light" text={driver.familyName} size={84} />

            <Appear index={1} style={[styles.band, { borderTopColor: teamColor(team) }]}>
              <Text style={[styles.number, { color: teamColor(team) }]}>{driver.permanentNumber}</Text>
              <DriverRender driverId={driver.driverId} constructorId={team} style={styles.helmet} />
              <View style={styles.bandText}>
                <Text style={[type.label, styles.onBand]}>
                  {nationalityFlag(driver.nationality)} {driver.nationality}
                </Text>
                <Text style={[type.value, styles.upper, styles.onBandStrong]}>{teamMeta(team).shortName}</Text>
              </View>
            </Appear>

            <Appear index={2} style={styles.followRow}>
              <PillButton
                tone="light"
                variant={following ? "outline" : "solid"}
                icon={following ? "checkmark" : "star-outline"}
                label={following ? "Following" : "Follow driver"}
                onPress={() => toggleFavorite(driver.driverId)}
              />
            </Appear>

            <Appear index={3}>
              <FieldRow style={styles.fields}>
                <Field tone="light" label="Position" value={standing ? `P${standing.positionText}` : "—"} />
                <Field tone="light" label="Points" value={standing?.points ?? "0"} />
                <Field tone="light" label="Wins" value={standing?.wins ?? "0"} />
              </FieldRow>
              <FieldRow style={styles.fields}>
                <Field tone="light" label="Podiums" value={String(podiums)} />
                <Field tone="light" label="Best finish" value={Number.isFinite(best) ? `P${best}` : "—"} />
                <Field
                  tone="light"
                  label="To leader"
                  value={standing ? (leaderPoints - Number(standing.points) === 0 ? "—" : `-${leaderPoints - Number(standing.points)}`) : "—"}
                />
              </FieldRow>
            </Appear>

            <Appear index={4}>
              <SectionHeader tone="light" title="Season" />
              {results.isPending ? (
                <View style={styles.skeleton}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Skeleton key={i} tone="light" height={48} />
                  ))}
                </View>
              ) : results.isError ? (
                <ErrorState tone="light" onRetry={() => results.refetch()} />
              ) : races.length ? (
                [...races].reverse().map(({ race, result }) => (
                  <PressableScale
                    key={race.round}
                    onPress={() => router.push(`/race/${race.round}`)}
                    scaleTo={0.98}
                    accessibilityRole="link"
                    accessibilityLabel={`${race.raceName}, finished ${result.positionText}`}
                    style={styles.resultRow}
                  >
                    <Text style={styles.round}>R{race.round}</Text>
                    <View style={styles.flex}>
                      <Text style={[type.value, styles.upper, { color: t.text, fontSize: 18 }]} numberOfLines={2}>
                        {shortRaceName(race)}
                      </Text>
                      <Text style={[type.label, { color: t.muted }]}>
                        {result.grid && result.grid !== "0" ? `Started P${result.grid}` : "Pit lane start"}
                        {Number(result.points) > 0 ? ` · +${result.points} pts` : ""}
                      </Text>
                    </View>
                    <Text style={[styles.finish, { color: Number(result.position) <= 3 ? t.text : t.muted }]}>
                      {/^\d+$/.test(result.positionText) ? `P${result.positionText}` : result.positionText}
                    </Text>
                    <RowAffordance tone="light" />
                  </PressableScale>
                ))
              ) : (
                <EmptyState tone="light" message="No race results yet this season." />
              )}
            </Appear>
          </>
        )}
      </Animated.ScrollView>
      <TopBar tone="light" scrollY={scrollY} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.bg },
  content: { paddingHorizontal: space.gutter },
  upper: { textTransform: "uppercase" },
  flex: { flex: 1, gap: 2 },
  back: { marginTop: space.lg },
  skeleton: { gap: space.lg, marginTop: space.xl },
  band: {
    marginHorizontal: -space.gutter,
    marginTop: space.xl,
    height: 260,
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: t.band,
    borderTopWidth: 4,
  },
  number: {
    position: "absolute",
    left: space.gutter - 6,
    top: -20,
    fontFamily: fonts.mono,
    fontSize: 180,
    lineHeight: 200,
    opacity: 0.25,
  },
  helmet: { position: "absolute", right: space.md, bottom: 0, height: 230 },
  bandText: { padding: space.gutter, gap: 4, maxWidth: "55%" },
  onBand: { color: t.muted },
  onBandStrong: { color: t.text },
  followRow: { marginTop: space.xl },
  fields: { marginTop: space.xl },
  resultRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  round: { width: 40, fontFamily: fonts.mono, fontSize: 16, color: t.dim },
  finish: { fontFamily: fonts.mono, fontSize: 20, minWidth: 44, textAlign: "right" },
});
