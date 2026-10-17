import { useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import type { Race } from "../../src/api/types";
import { RaceCard } from "../../src/components/RaceCard";
import { ScreenGlow, ScreenHeader } from "../../src/components/ScreenHeader";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { EmptyState, ErrorState, Skeleton } from "../../src/components/ui";
import { usePodiums, useSchedule } from "../../src/hooks/queries";
import { useNow } from "../../src/hooks/useNow";
import { useRefresh } from "../../src/hooks/useRefresh";
import { timeZoneName } from "../../src/lib/format";
import { getNextRace, isRaceComplete } from "../../src/lib/race";
import { colors, space, type } from "../../src/theme";

const FILTERS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

export default function ScheduleScreen() {
  const [filter, setFilter] = useState<Filter>("upcoming");
  const now = useNow(60_000);
  const schedule = useSchedule();
  const podiums = usePodiums();
  const { refreshing, onRefresh } = useRefresh();

  const races = schedule.data ?? [];
  const nextRound = getNextRace(races, now)?.round;

  const data = useMemo(() => {
    if (filter === "upcoming") return races.filter((r) => !isRaceComplete(r, now));
    // Most recent first, so the latest results are one tap away.
    if (filter === "completed") return races.filter((r) => isRaceComplete(r, now)).reverse();
    return races;
  }, [races, filter, now]);

  const renderItem = ({ item }: { item: Race }) => {
    const completed = isRaceComplete(item, now);
    return (
      <RaceCard
        race={item}
        completed={completed}
        isNext={item.round === nextRound}
        podium={completed ? podiums.data?.[item.round] : undefined}
      />
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <FlatList
        data={data}
        keyExtractor={(r) => `${r.season}-${r.round}`}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
        ListHeaderComponent={
          <ScreenHeader eyebrow={races[0] ? `${races[0].season} calendar` : "Calendar"} title="Schedule">
            <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
            <Text style={styles.tz}>Times shown in {timeZoneName()}</Text>
          </ScreenHeader>
        }
        ListEmptyComponent={
          schedule.isPending ? (
            <View style={styles.skeletons}>
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} height={76} />
              ))}
            </View>
          ) : schedule.isError ? (
            <ErrorState onRetry={() => schedule.refetch()} />
          ) : (
            <EmptyState
              icon="flag-outline"
              message={filter === "upcoming" ? "No races left this season." : "No races completed yet."}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  tz: { ...type.label, fontSize: 12, color: colors.textDim, marginTop: space.sm, marginBottom: space.md },
  skeletons: { gap: space.sm + 2 },
});
