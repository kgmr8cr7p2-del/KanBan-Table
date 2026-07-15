import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DZEN_NEWS_URL = "https://dzen.ru/news";
const ROTATION_INTERVAL_MS = 15 * 60 * 1000;
const MAX_RESPONSE_BYTES = 6 * 1024 * 1024;

type NewsCandidate = {
  sourceId: string;
  title: string;
  sourceUrl: string;
};

type NewsRecord = NewsCandidate & {
  id: string;
  shownAt: Date;
  lastCheckedAt: Date;
};

export type TvNewsPayload = {
  id: string;
  title: string;
  sourceUrl: string;
  shownAt: string;
  nextRefreshAt: string;
  stale: boolean;
};

export async function getTvNews(now = new Date()): Promise<TvNewsPayload> {
  let latest = await prisma.tvNewsItem.findFirst({ orderBy: { shownAt: "desc" } });

  if (latest && now.getTime() - latest.lastCheckedAt.getTime() < ROTATION_INTERVAL_MS) {
    return serializeNews(latest, false);
  }

  if (latest) {
    const claim = await prisma.tvNewsItem.updateMany({
      where: { id: latest.id, lastCheckedAt: latest.lastCheckedAt },
      data: { lastCheckedAt: now },
    });

    if (!claim.count) {
      latest = await prisma.tvNewsItem.findFirst({ orderBy: { shownAt: "desc" } });
      if (latest) return serializeNews(latest, false);
    } else {
      latest = { ...latest, lastCheckedAt: now };
    }
  }

  let candidates: NewsCandidate[];
  try {
    candidates = await fetchDzenMainNews();
  } catch (error) {
    if (latest) return serializeNews(latest, true);
    throw error;
  }

  const shownRows = await prisma.tvNewsItem.findMany({
    where: { sourceId: { in: candidates.map((candidate) => candidate.sourceId) } },
    select: { sourceId: true },
  });
  const shownIds = new Set(shownRows.map((row) => row.sourceId));
  const nextCandidate = candidates.find((candidate) => !shownIds.has(candidate.sourceId));

  if (!nextCandidate) {
    if (latest) return serializeNews(latest, true);
    throw new Error("В разделе «Главное» пока нет новой новости");
  }

  try {
    const created = await prisma.tvNewsItem.create({
      data: { ...nextCandidate, shownAt: now, lastCheckedAt: now },
    });
    return serializeNews(created, false);
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const current = await prisma.tvNewsItem.findFirst({ orderBy: { shownAt: "desc" } });
    if (!current) throw error;
    return serializeNews(current, false);
  }
}

export async function fetchDzenMainNews(): Promise<NewsCandidate[]> {
  const response = await fetch(DZEN_NEWS_URL, {
    cache: "no-store",
    headers: {
      accept: "text/html,application/xhtml+xml",
      "accept-language": "ru-RU,ru;q=0.9",
      cookie: "zen_sso_checked=1; zen_vk_sso_checked=1; Session_id=noauth; dzen_sess_id=noauth",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) throw new Error(`Дзен Новости вернул статус ${response.status}`);
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_RESPONSE_BYTES) throw new Error("Ответ Дзена превышает допустимый размер");

  const html = await response.text();
  if (html.length > MAX_RESPONSE_BYTES) throw new Error("Страница Дзена превышает допустимый размер");
  return parseDzenMainNews(html);
}

export function parseDzenMainNews(html: string): NewsCandidate[] {
  const mainBodyStart = html.indexOf("news-main-page__body");
  const headingArea = html.slice(Math.max(0, mainBodyStart - 10_000), mainBodyStart);
  if (mainBodyStart < 0 || !headingArea.includes(">Главное</h1>")) {
    throw new Error("Не удалось найти раздел «Главное» на странице Дзена");
  }

  const mainEnd = html.indexOf("</main>", mainBodyStart);
  const mainHtml = html.slice(mainBodyStart, mainEnd > mainBodyStart ? mainEnd : undefined);
  const candidates = new Map<string, NewsCandidate>();

  for (const match of mainHtml.matchAll(/<a\b[^>]*>/gi)) {
    const tag = match[0];
    if (!tag.includes("card-news__titleLink")) continue;

    const href = getHtmlAttribute(tag, "href");
    const title = normalizeText(getHtmlAttribute(tag, "title") ?? "");
    if (!href || !title) continue;

    try {
      const parsedUrl = new URL(decodeHtml(href), DZEN_NEWS_URL);
      if (parsedUrl.hostname !== "dzen.ru" || !parsedUrl.pathname.startsWith("/news/story/")) continue;
      const sourceId = parsedUrl.pathname.split("/").filter(Boolean).at(-1);
      if (!sourceId || candidates.has(sourceId)) continue;

      candidates.set(sourceId, {
        sourceId,
        title,
        sourceUrl: new URL(parsedUrl.pathname, DZEN_NEWS_URL).toString(),
      });
    } catch {
      continue;
    }
  }

  if (!candidates.size) throw new Error("В разделе «Главное» не найдены новости");
  return [...candidates.values()];
}

function serializeNews(news: NewsRecord, stale: boolean): TvNewsPayload {
  return {
    id: news.id,
    title: news.title,
    sourceUrl: news.sourceUrl,
    shownAt: news.shownAt.toISOString(),
    nextRefreshAt: new Date(news.lastCheckedAt.getTime() + ROTATION_INTERVAL_MS).toISOString(),
    stale,
  };
}

function getHtmlAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
  return match?.[1] ?? match?.[2] ?? null;
}

function normalizeText(value: string) {
  return decodeHtml(value).replace(/[\s\u00a0]+/g, " ").trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
