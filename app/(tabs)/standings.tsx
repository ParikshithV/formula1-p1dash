import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import type { ConstructorStanding, DriverStanding } from "../../src/api/types";
import { ScreenGlow, ScreenHeader } from "../../src/components/ScreenHeader";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { ConstructorStandingRow, DriverStandingRow, resolveTeam } from "../../src/components/StandingRows";
import { ErrorState, Skeleton } from "../../src/components/ui";
import { useConstructorStandings, useCurrentTeams, useDriverStandings } from "../../src/hooks/queries";
import { useFavoriteDriver } from "../../src/hooks/useFavoriteDriver";
import { useRefresh } from "../../src/hooks/useRefresh";
import { colors, space, type } from "../../src/theme";

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
  const { refreshing, onRefresh } = useRefresh();

  const active = tab === "drivers" ? drivers : teams;
  const round = active.data?.round;

  const header = (
    <ScreenHeader eyebrow={round ? `After round ${round}` : "World Championship"} title="Standings">
      <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      <View style={{ height: space.lg }} />
    </ScreenHeader>
  );

  const empty = active.isPending ? (
    <View style={styles.skeletons}>
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} height={tab === "drivers" ? 66 : 150} />
      ))}
    </View>
  ) : active.isError ? (
    <ErrorState onRetry={() => active.refetch()} />
  ) : (
    <Text style={styles.none}>No standings yet — check back after the first race.</Text>
  );

  const common = {
    contentContainerStyle: styles.content,
    ListHeaderComponent: header,
    ListEmptyComponent: empty,
    refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />,
  };

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      {tab === "drivers" ? (
        <FlatList<DriverStanding>
          {...common}
          data={drivers.data?.standings ?? []}
          keyExtractor={(s) => s.Driver.driverId}
          extraData={[favoriteDriverId, currentTeams.data]}
          renderItem={({ item }) => (
            <DriverStandingRow
              standing={item}
              constructorId={resolveTeam(item, currentTeams.data)}
              leaderPoints={Number(drivers.data?.standings[0]?.points ?? 0)}
              isFavorite={item.Driver.driverId === favoriteDriverId}
              onToggleFavorite={toggleFavorite}
            />
          )}
        />
      ) : (
        <FlatList<ConstructorStanding>
          {...common}
          data={teams.data?.standings ?? []}
          keyExtractor={(s) => s.Constructor.constructorId}
          renderItem={({ item }) => (
            <ConstructorStandingRow standing={item} leaderPoints={Number(teams.data?.standings[0]?.points ?? 0)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  skeletons: { gap: space.sm },
  none: { ...type.body, color: colors.textMuted, textAlign: "center", marginTop: space.xl },
});
