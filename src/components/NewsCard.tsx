import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NewsItem } from "../api/types";
import { useArticleImage } from "../hooks/queries";
import { colors, radius, space, type } from "../theme";
import { Card, Skeleton } from "./ui";

export const openArticle = (url: string) =>
  WebBrowser.openBrowserAsync(url, {
    toolbarColor: colors.bg,
    controlsColor: colors.accent,
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  }).catch(() => {});

function NewsCardBase({ item, featured }: { item: NewsItem; featured?: boolean }) {
  const { data: image, isPending } = useArticleImage(item.link);

  if (featured) {
    return (
      <Card onPress={() => openArticle(item.link)} style={styles.featured}>
        {isPending ? (
          <Skeleton height={220} style={styles.noRadius} />
        ) : (
          <Image source={image ?? undefined} style={styles.featuredImage} contentFit="cover" transition={300} />
        )}
        <LinearGradient colors={["transparent", "rgba(11,11,15,0.95)"]} style={styles.featuredShade} />
        <View style={styles.featuredText}>
          <Text style={[type.caption, styles.tag]}>Latest</Text>
          <Text style={type.title} numberOfLines={3}>
            {item.title}
          </Text>
          <Text style={[type.label, styles.desc]} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card onPress={() => openArticle(item.link)} style={styles.compact}>
      <View style={styles.compactText}>
        <Text style={type.heading} numberOfLines={3}>
          {item.title}
        </Text>
        <Text style={[type.label, styles.desc]} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
      {isPending ? (
        <Skeleton height={84} width={96} />
      ) : image ? (
        <Image source={image} style={styles.thumb} contentFit="cover" transition={300} />
      ) : null}
    </Card>
  );
}

export const NewsCard = memo(NewsCardBase);

const styles = StyleSheet.create({
  featured: { height: 340, justifyContent: "flex-end", marginBottom: space.md },
  featuredImage: { ...StyleSheet.absoluteFill },
  featuredShade: { ...StyleSheet.absoluteFill, top: "30%" },
  featuredText: { padding: space.lg, gap: 4 },
  noRadius: { ...StyleSheet.absoluteFill, borderRadius: 0, height: "100%" },
  tag: { color: colors.accent },
  desc: { marginTop: 2 },
  compact: { flexDirection: "row", gap: space.md, padding: space.md, marginBottom: space.sm + 2, alignItems: "center" },
  compactText: { flex: 1, gap: 2 },
  thumb: { width: 96, height: 84, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
});
