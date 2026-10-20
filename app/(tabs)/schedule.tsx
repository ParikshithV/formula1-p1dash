import { useMemo, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import type { Race } from "../../src/api/types";
import { Appear, useScrollY } from "../../src/components/motion";
import { RaceCard } from "../../src/components/RaceCard";
import { TopBar, useTopBarSpace } from "../../src/components/TopBar";
import { BigTitle, EmptyState, ErrorState, Skeleton, Segmented } from "../../src/components/ui";
import { usePodiums, useSchedule } from "../../src/hooks/queries";
import { useNow } from "../../src/hooks/useNow";
import { useRefresh } from "../../src/hooks/useRefresh";
import { timeZoneName } from "../../src/lib/format";
import { getNextRace, isRaceComplete } from "../../src/lib/race";
import { colors, frameStyle, space, type } from "../../src/theme";

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
  const { scrollY, onScroll } = useScrollY();
  const top = useTopBarSpace();

  const races = schedule.data ?? [];
  const nextRound = getNextRace(races, now)?.round;

  const data = useMemo(() => {
    if (filter === "upcoming") return races.filter((r) => !isRaceComplete(r, now));
    // Most recent first, so the latest results are one tap away.
    if (filter === "completed") return races.filter((r) => isRaceComplete(r, now)).reverse();
    return races;
  }, [races, filter, now]);

  const renderItem = ({ item, index }: { item: Race; index: number }) => {
    const completed = isRaceComplete(item, now);
    return (
      <Appear index={index}>
        <RaceCard
          race={item}
          completed={completed}
          isNext={item.round === nextRound}
          podium={completed ? podiums.data?.[item.round] : undefined}
        />
      </Appear>
    );
  };

  return (
    <View style={styles.screen}>
      <Animated.FlatList
        data={data}
        extraData={[filter, podiums.data, nextRound]}
        // Keyed by filter so switching remounts the rows and re-staggers them in.
        keyExtractor={(r) => `${filter}-${r.season}-${r.round}`}
        renderItem={renderItem}
        onScroll={onScroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.content, frameStyle, { paddingTop: top, paddingBottom: space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} progressViewOffset={top} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <BigTitle text="Schedule" />
            <Text style={[type.label, styles.caption]}>
              {races[0] ? `${races[0].season} calendar · ` : ""}Times in {timeZoneName()}
            </Text>
            <Segmented options={FILTERS} value={filter} onChange={setFilter} />
          </View>
        }
        ListEmptyComponent={
          schedule.isPending ? (
            <View style={styles.skeletons}>
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} height={88} />
              ))}
            </View>
          ) : schedule.isError ? (
            <ErrorState onRetry={() => schedule.refetch()} />
          ) : (
            <EmptyState message={filter === "upcoming" ? "No races left this season." : "No races completed yet."} />
          )
        }
      />
      <TopBar scrollY={scrollY} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.gutter },
  header: { marginBottom: space.lg },
  caption: { color: colors.muted, marginTop: space.sm, marginBottom: space.xl },
  skeletons: { gap: space.lg, marginTop: space.lg },
});
