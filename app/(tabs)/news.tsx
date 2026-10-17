import { FlatList, Platform, RefreshControl, StyleSheet, View } from "react-native";
import { NewsCard } from "../../src/components/NewsCard";
import { ScreenGlow, ScreenHeader } from "../../src/components/ScreenHeader";
import { ErrorState, Skeleton } from "../../src/components/ui";
import { useNews } from "../../src/hooks/queries";
import { useRefresh } from "../../src/hooks/useRefresh";
import { colors, space } from "../../src/theme";

export default function NewsScreen() {
  const news = useNews();
  const { refreshing, onRefresh } = useRefresh();

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <FlatList
        data={news.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <NewsCard item={item} featured={index === 0} />}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
        ListHeaderComponent={<ScreenHeader eyebrow="From formula1.com" title="Paddock news" />}
        ListEmptyComponent={
          news.isPending ? (
            <View style={styles.skeletons}>
              <Skeleton height={340} />
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} height={108} />
              ))}
            </View>
          ) : (
            <ErrorState
              message={
                Platform.OS === "web"
                  ? "formula1.com doesn't allow browser requests (CORS). The news feed works in the iOS and Android apps."
                  : "Couldn't load the news feed."
              }
              onRetry={Platform.OS === "web" ? undefined : () => news.refetch()}
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
  skeletons: { gap: space.sm + 2 },
});
