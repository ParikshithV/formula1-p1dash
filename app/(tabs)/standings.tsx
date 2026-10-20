import { useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import type { ConstructorStanding, DriverStanding } from "../../src/api/types";
import { Appear, useScrollY } from "../../src/components/motion";
import { ConstructorStandingRow, DriverStandingRow, resolveTeam } from "../../src/components/StandingRows";
import { TopBar, useTopBarSpace } from "../../src/components/TopBar";
import { BigTitle, EmptyState, ErrorState, Skeleton, Segmented } from "../../src/components/ui";
import { useConstructorStandings, useCurrentTeams, useDriverStandings } from "../../src/hooks/queries";
import { useFavoriteDriver, usePreferences } from "../../src/hooks/usePreferences";
import { useRefresh } from "../../src/hooks/useRefresh";
import { colors, frameStyle, space, type } from "../../src/theme";

const TABS = [
  { value: "drivers", label: "Drivers" },
  { value: "teams", label: "Teams" },
] as const;

type Tab = (typeof TABS)[number]["value"];

export default function StandingsScreen() {
  const [tab, setTab] = useState<Tab>("drivers");
  const drivers = useDriverStandings();
  const teams = useConstructorStandings();
  const currentTeams = useCurrentTeams();
  const { favoriteDriverId, toggleFavorite } = useFavoriteDriver();
  const { prefs } = usePreferences();
  const { refreshing, onRefresh } = useRefresh();
  const { scrollY, onScroll } = useScrollY();
  const top = useTopBarSpace();

  const active = tab === "drivers" ? drivers : teams;
  const round = active.data?.round;

  const header = (
    <View style={styles.header}>
      <BigTitle text="Standings" />
      <Text style={[type.label, styles.caption]}>{round ? `World Championship · after round ${round}` : "World Championship"}</Text>
      <Segmented options={TABS} value={tab} onChange={setTab} />
    </View>
  );

  const empty = active.isPending ? (
    <View style={styles.skeletons}>
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} height={tab === "drivers" ? 72 : 180} />
      ))}
    </View>
  ) : active.isError ? (
    <ErrorState onRetry={() => active.refetch()} />
  ) : (
    <EmptyState message="No standings yet — check back after the first race." />
  );

  const common = {
    contentContainerStyle: [styles.content, frameStyle, { paddingTop: top, paddingBottom: space.xxl }],
    ListHeaderComponent: header,
    ListEmptyComponent: empty,
    onScroll,
    showsVerticalScrollIndicator: false,
    scrollEventThrottle: 16,
    refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} progressViewOffset={top} />,
  };

  return (
    <View style={styles.screen}>
      {tab === "drivers" ? (
        <Animated.FlatList<DriverStanding>
          {...common}
          data={drivers.data?.standings ?? []}
          keyExtractor={(s) => s.Driver.driverId}
          extraData={[favoriteDriverId, currentTeams.data]}
          renderItem={({ item, index }) => (
            <Appear index={index}>
              <DriverStandingRow
                standing={item}
                constructorId={resolveTeam(item, currentTeams.data)}
                leaderPoints={Number(drivers.data?.standings[0]?.points ?? 0)}
                isFavorite={item.Driver.driverId === favoriteDriverId}
                onToggleFavorite={toggleFavorite}
                index={index}
              />
            </Appear>
          )}
        />
      ) : (
        <Animated.FlatList<ConstructorStanding>
          {...common}
          data={teams.data?.standings ?? []}
          keyExtractor={(s) => s.Constructor.constructorId}
          extraData={prefs.favoriteTeamId}
          renderItem={({ item, index }) => (
            <Appear index={index}>
              <ConstructorStandingRow
                standing={item}
                leaderPoints={Number(teams.data?.standings[0]?.points ?? 0)}
                index={index}
                isFavorite={item.Constructor.constructorId === prefs.favoriteTeamId}
              />
            </Appear>
          )}
        />
      )}
      <TopBar scrollY={scrollY} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.gutter },
  header: { marginBottom: space.md },
  caption: { color: colors.muted, marginTop: space.sm, marginBottom: space.xl },
  skeletons: { gap: space.lg, marginTop: space.lg },
});
