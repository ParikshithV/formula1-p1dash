import * as WebBrowser from "expo-web-browser";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NewsItem } from "../api/types";
import { timeAgo } from "../lib/format";
import { colors, fonts, space, tones, type } from "../theme";
import { NewsCover } from "./art/NewsCover";
import { PressableScale } from "./motion";
import { PillButton, RowAffordance } from "./ui";

const t = tones.dark;

export const openArticle = (url: string) =>
  WebBrowser.openBrowserAsync(url, {
    toolbarColor: colors.bg,
    controlsColor: colors.accent,
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  }).catch(() => {});

const age = (item: NewsItem) => (item.published ? timeAgo(new Date(item.published)) : "Latest");

/** Lead story: generated cover band, then the headline set large below it. */
function FeaturedNews({ item }: { item: NewsItem }) {
  return (
    <PressableScale onPress={() => openArticle(item.link)} scaleTo={0.985} style={styles.featured}>
      <View style={styles.cover}>
        <NewsCover kicker="Latest" />
      </View>
      <Text style={[type.label, { color: colors.accent }]}>Latest · {age(item)}</Text>
      <Text style={styles.featuredTitle} numberOfLines={4}>
        {item.title}
      </Text>
      <Text style={[type.body, { color: t.muted }]} numberOfLines={3}>
        {item.description}
      </Text>
      <PillButton label="Read story" icon="arrow-up-outline" onPress={() => openArticle(item.link)} style={styles.read} />
    </PressableScale>
  );
}

/** Text-only timeline row: age in the caption column, headline on the right. */
function NewsRow({ item }: { item: NewsItem }) {
  return (
    <PressableScale onPress={() => openArticle(item.link)} scaleTo={0.98} accessibilityRole="link" style={styles.row}>
      <Text style={[type.label, styles.meta]}>{age(item)}</Text>
      <Text style={[type.headline, styles.title]} numberOfLines={3}>
        {item.title}
      </Text>
      <RowAffordance external />
    </PressableScale>
  );
}

function NewsCardBase({ item, featured }: { item: NewsItem; featured?: boolean }) {
  return featured ? <FeaturedNews item={item} /> : <NewsRow item={item} />;
}

export const NewsCard = memo(NewsCardBase);

const styles = StyleSheet.create({
  featured: { gap: space.md, marginBottom: space.xl },
  cover: { marginBottom: space.md },
  featuredTitle: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: t.text },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.lg },
  meta: { width: 56, alignSelf: "flex-start", paddingTop: 4, color: t.dim, textAlign: "right" },
  title: { flex: 1, color: t.text },
  read: { marginTop: space.xs },
});
