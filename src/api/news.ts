import type { NewsItem } from "./types";

const FEED_URL = "https://www.formula1.com/en/latest/all.xml";

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decode(raw: string) {
  return raw
    .replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/<[^>]+>/g, "")
    .trim();
}

function tag(xml: string, name: string) {
  const match = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return match ? decode(match[1]) : "";
}

export async function fetchNews(): Promise<NewsItem[]> {
  const res = await fetch(FEED_URL);
  if (!res.ok) {
    throw new Error(`News feed ${res.status}`);
  }
  const xml = await res.text();
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items
    .map((item) => {
      const link = tag(item, "link");
      const date = new Date(tag(item, "pubDate"));
      return {
        id: tag(item, "guid") || link,
        title: tag(item, "title"),
        description: tag(item, "description"),
        link,
        published: Number.isNaN(date.getTime()) ? undefined : date.toISOString(),
      };
    })
    .filter((item) => item.title && item.link);
}
