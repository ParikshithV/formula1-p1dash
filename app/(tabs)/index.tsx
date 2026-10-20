import { router } from "expo-router";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { DriverSpotlight } from "../../src/components/DriverSpotlight";
import { LastRace } from "../../src/components/LastRace";
import { Appear, useScrollY } from "../../src/components/motion";
import { NewsCard } from "../../src/components/NewsCard";
import { NextRaceHero } from "../../src/components/NextRaceHero";
import { DriverStandingRow, resolveTeam } from "../../src/components/StandingRows";
import { TeamSpotlight } from "../../src/components/TeamSpotlight";
import { TopBar, useTopBarSpace } from "../../src/components/TopBar";
import { BigTitle, ErrorState, PillButton, SectionHeader, Skeleton } from "../../src/components/ui";
import { useConstructorStandings, useCurrentTeams, useDriverStandings, useNews, usePodiums, useSchedule } from "../../src/hooks/queries";
import { useFavoriteDriver, usePreferences } from "../../src/hooks/usePreferences";
import { useNow } from "../../src/hooks/useNow";
import { useRefresh } from "../../src/hooks/useRefresh";
import { getLastCompletedRace, getNextRace } from "../../src/lib/race";
import { colors, frameStyle, space, type } from "../../src/theme";

export default function HomeScreen() {
  const now = useNow(60_000);
  const schedule = useSchedule();
  const podiums = usePodiums();
  const drivers = useDriverStandings();
  const constructors = useConstructorStandings();
  const { prefs } = usePreferences();
  const news = useNews();
  const currentTeams = useCurrentTeams();
  const { favoriteDriverId, toggleFavorite } = useFavoriteDriver();
  const { refreshing, onRefresh } = useRefresh();
  const { scrollY, onScroll } = useScrollY();
  const top = useTopBarSpace();

  const races = schedule.data ?? [];
  const nextRace = getNextRace(races, now);
  const lastRace = getLastCompletedRace(races, now);
  const lastPodium = lastRace ? podiums.data?.[lastRace.round] : undefined;
  const standings = drivers.data?.standings ?? [];
  const leaderPoints = Number(standings[0]?.points ?? 0);
  const favorite = standings.find((s) => s.Driver.driverId === favoriteDriverId);
  const teamStandings = constructors.data?.standings ?? [];
  const favoriteTeam = teamStandings.find((s) => s.Constructor.constructorId === prefs.favoriteTeamId);
  const openPreferences = () => router.push({ pathname: "/onboarding", params: { mode: "edit" } });

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        onScroll={onScroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.content, frameStyle, { paddingTop: top + space.lg, paddingBottom: space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} progressViewOffset={top} />}
      >
        {schedule.isPending ? (
          <View style={styles.skeleton}>
            <Skeleton height={14} width={160} />
            <Skeleton height={300} />
            <Skeleton height={60} />
          </View>
        ) : schedule.isError ? (
          <ErrorState onRetry={() => schedule.refetch()} />
        ) : nextRace ? (
          <NextRaceHero race={nextRace} roundsTotal={races.length} />
        ) : (
          <>
            <BigTitle text="Season over" />
            <Text style={[type.body, styles.muted]}>See you next year. The full calendar and results live in Schedule.</Text>
          </>
        )}

        {lastRace && lastPodium?.length ? (
          <Appear index={6}>
            <SectionHeader title="Last race" action="Results" onAction={() => router.push(`/race/${lastRace.round}`)} />
            <LastRace race={lastRace} podium={lastPodium} />
          </Appear>
        ) : null}

        {favorite ? (
          <Appear index={7}>
            <SectionHeader title="Following" action="Profile" onAction={() => router.push(`/driver/${favorite.Driver.driverId}`)} />
            <DriverSpotlight standing={favorite} constructorId={resolveTeam(favorite, currentTeams.data)} leaderPoints={leaderPoints} />
          </Appear>
        ) : null}

        {favoriteTeam ? (
          <Appear index={8}>
            <SectionHeader title="Your team" action="Teams" onAction={() => router.navigate("/standings")} />
            <TeamSpotlight standing={favoriteTeam} leaderPoints={Number(teamStandings[0]?.points ?? 0)} />
          </Appear>
        ) : null}

        {!favorite && !favoriteTeam && standings.length ? (
          <Appear index={8} style={styles.prompt}>
            <Text style={[type.heading, styles.promptTitle]}>MAKE IT YOURS/</Text>
            <Text style={[type.body, styles.muted]}>
              Follow a driver and a team to get their numbers here, and turn on session reminders.
            </Text>
            <PillButton label="Personalise" icon="options-outline" variant="solid" onPress={openPreferences} style={styles.promptButton} />
          </Appear>
        ) : null}

        {standings.length ? (
          <Appear index={9}>
            <SectionHeader title="Championship" action="Standings" onAction={() => router.navigate("/standings")} />
            {standings.slice(0, 3).map((s, i) => (
              <DriverStandingRow
                key={s.Driver.driverId}
                standing={s}
                constructorId={resolveTeam(s, currentTeams.data)}
                leaderPoints={leaderPoints}
                isFavorite={s.Driver.driverId === favoriteDriverId}
                onToggleFavorite={toggleFavorite}
                index={i}
              />
            ))}
          </Appear>
        ) : null}

        {news.data?.length ? (
          <Appear index={10}>
            <SectionHeader title="Paddock" action="All news" onAction={() => router.navigate("/news")} />
            {news.data.slice(0, 3).map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </Appear>
        ) : null}
      </Animated.ScrollView>
      <TopBar scrollY={scrollY} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.gutter },
  skeleton: { gap: space.xl },
  muted: { color: colors.muted, marginTop: space.lg },
  prompt: { marginTop: space.section, padding: space.xl, borderWidth: 1, borderColor: colors.line },
  promptTitle: { color: colors.text },
  promptButton: { marginTop: space.xl },
});
