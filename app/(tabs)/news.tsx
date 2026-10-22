import { Redirect } from "expo-router";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { Appear, useScrollY } from "../../src/components/motion";
import { NewsCard } from "../../src/components/NewsCard";
import { TopBar, useTopBarSpace } from "../../src/components/TopBar";
import { BigTitle, ErrorState, Skeleton } from "../../src/components/ui";
import { useNews } from "../../src/hooks/queries";
import { useRefresh } from "../../src/hooks/useRefresh";
import { NEWS_SUPPORTED } from "../../src/lib/platform";
import { colors, frameStyle, space, type } from "../../src/theme";

export default function NewsScreen() {
  // formula1.com sends no CORS headers, so the feed can't be read from a browser.
  if (!NEWS_SUPPORTED) return <Redirect href="/" />;
  return <NewsFeed />;
}

function NewsFeed() {
  const news = useNews();
  const { refreshing, onRefresh } = useRefresh();
  const { scrollY, onScroll } = useScrollY();
  const top = useTopBarSpace();

  return (
    <View style={styles.screen}>
      <Animated.FlatList
        data={news.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Appear index={index}>
            <NewsCard item={item} featured={index === 0} />
          </Appear>
        )}
        onScroll={onScroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.content, frameStyle, { paddingTop: top, paddingBottom: space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} progressViewOffset={top} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <BigTitle text="Paddock" />
            <Text style={[type.label, styles.caption]}>Stories from formula1.com</Text>
          </View>
        }
        ListEmptyComponent={
          news.isPending ? (
            <View style={styles.skeletons}>
              <Skeleton height={260} />
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} height={56} />
              ))}
            </View>
          ) : (
            <ErrorState message="Couldn't load the news feed." onRetry={() => news.refetch()} />
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
  header: { marginBottom: space.xl },
  caption: { color: colors.muted, marginTop: space.sm },
  skeletons: { gap: space.lg },
});
