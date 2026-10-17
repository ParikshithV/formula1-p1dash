import { router } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { DriverSpotlight } from "../../src/components/DriverSpotlight";
import { NewsCard } from "../../src/components/NewsCard";
import { NextRaceHero } from "../../src/components/NextRaceHero";
import { PodiumCard } from "../../src/components/PodiumCard";
import { ScreenGlow, ScreenHeader } from "../../src/components/ScreenHeader";
import { SeasonProgress } from "../../src/components/SeasonProgress";
import { DriverStandingRow, resolveTeam } from "../../src/components/StandingRows";
import { Card, ErrorState, SectionHeader, Skeleton } from "../../src/components/ui";
import { useCurrentTeams, useDriverStandings, useNews, usePodiums, useSchedule } from "../../src/hooks/queries";
import { useFavoriteDriver } from "../../src/hooks/useFavoriteDriver";
import { useNow } from "../../src/hooks/useNow";
import { useRefresh } from "../../src/hooks/useRefresh";
import { getLastCompletedRace, getNextRace, isRaceComplete } from "../../src/lib/race";
import { colors, space, type } from "../../src/theme";

export default function HomeScreen() {
  const now = useNow(60_000);
  const schedule = useSchedule();
  const podiums = usePodiums();
  const drivers = useDriverStandings();
  const news = useNews();
  const currentTeams = useCurrentTeams();
  const { favoriteDriverId, toggleFavorite } = useFavoriteDriver();
  const { refreshing, onRefresh } = useRefresh();

  const races = schedule.data ?? [];
  const nextRace = getNextRace(races, now);
  const lastRace = getLastCompletedRace(races, now);
  const lastPodium = lastRace ? podiums.data?.[lastRace.round] : undefined;
  const completed = races.filter((r) => isRaceComplete(r, now)).length;
  const standings = drivers.data?.standings ?? [];
  const leaderPoints = Number(standings[0]?.points ?? 0);
  const favorite = standings.find((s) => s.Driver.driverId === favoriteDriverId);

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        <ScreenHeader eyebrow={races[0] ? `Formula 1 · ${races[0].season}` : "Formula 1"} title="P1 Dash" />

        {schedule.isPending ? (
          <Skeleton height={300} />
        ) : schedule.isError ? (
          <ErrorState onRetry={() => schedule.refetch()} />
        ) : nextRace ? (
          <NextRaceHero race={nextRace} />
        ) : (
          <Card style={styles.offseason}>
            <Text style={type.title}>Season complete</Text>
            <Text style={type.label}>See you next year. Catch up on the results in Schedule.</Text>
          </Card>
        )}

        {races.length ? <SeasonProgress completed={completed} total={races.length} season={races[0].season} /> : null}

        {favorite ? (
          <>
            <SectionHeader title="Following" />
            <DriverSpotlight
              standing={favorite}
              constructorId={resolveTeam(favorite, currentTeams.data)}
              leaderPoints={leaderPoints}
            />
          </>
        ) : null}

        {lastRace && lastPodium?.length ? (
          <>
            <SectionHeader title="Last race" action="Results" onAction={() => router.push(`/race/${lastRace.round}`)} />
            <PodiumCard race={lastRace} podium={lastPodium} />
          </>
        ) : null}

        {standings.length ? (
          <>
            <SectionHeader title="Championship" action="Standings" onAction={() => router.navigate("/standings")} />
            {standings.slice(0, 3).map((s) => (
              <DriverStandingRow
                key={s.Driver.driverId}
                standing={s}
                constructorId={resolveTeam(s, currentTeams.data)}
                leaderPoints={leaderPoints}
                isFavorite={s.Driver.driverId === favoriteDriverId}
                onToggleFavorite={toggleFavorite}
              />
            ))}
            {!favorite ? <Text style={styles.hint}>Tap ★ on any driver to follow them here.</Text> : null}
          </>
        ) : null}

        {news.data?.length ? (
          <>
            <SectionHeader title="Latest news" action="All stories" onAction={() => router.navigate("/news")} />
            {news.data.slice(0, 3).map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  offseason: { padding: space.xl, gap: space.sm },
  hint: { ...type.label, fontSize: 12, color: colors.textDim, textAlign: "center", marginTop: space.xs },
});
