import { proxiedThumbnailUrl } from "./thumbnailProxy";
function parseStatValue(v) {
  if (v == null || v === "") return void 0;
  const n = typeof v === "string" ? Number(v.replace(/,/g, "")) : Number(v);
  return Number.isFinite(n) ? n : void 0;
}
function extractTikTokStats(struct, html) {
  const raw = struct.stats ?? struct.statsV2;
  if (raw) {
    const playCount2 = parseStatValue(raw.playCount);
    const diggCount2 = parseStatValue(raw.diggCount);
    const shareCount2 = parseStatValue(raw.shareCount);
    const commentCount2 = parseStatValue(raw.commentCount);
    if (playCount2 != null || diggCount2 != null || shareCount2 != null || commentCount2 != null) {
      return { playCount: playCount2, diggCount: diggCount2, shareCount: shareCount2, commentCount: commentCount2 };
    }
  }
  if (!html) return void 0;
  const playCount = parseStatValue(html.match(/"playCount"\s*:\s*"?(\d+)"?/)?.[1]);
  const diggCount = parseStatValue(html.match(/"diggCount"\s*:\s*"?(\d+)"?/)?.[1]);
  const shareCount = parseStatValue(html.match(/"shareCount"\s*:\s*"?(\d+)"?/)?.[1]);
  const commentCount = parseStatValue(html.match(/"commentCount"\s*:\s*"?(\d+)"?/)?.[1]);
  if (playCount != null || diggCount != null || shareCount != null || commentCount != null) {
    return { playCount, diggCount, shareCount, commentCount };
  }
  return void 0;
}
function extractHandleFromUrl(url) {
  if (!url) return void 0;
  const match = url.match(/tiktok\.com\/@([^/?#]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : void 0;
}
function extractTikTokAuthor(struct) {
  const author = struct.author;
  if (!author) return {};
  return {
    authorName: author.nickname || void 0,
    authorHandle: author.uniqueId || void 0,
    authorAvatarUrl: author.avatarMedium || author.avatarLarger || author.avatarThumb || void 0
  };
}
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function extractYoutubeVideoId(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return parsed.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname.startsWith("/watch")) return parsed.searchParams.get("v");
      const parts = parsed.pathname.split("/").filter(Boolean);
      const si = parts.indexOf("shorts");
      if (si >= 0 && parts[si + 1]) return parts[si + 1];
      const ei = parts.indexOf("embed");
      if (ei >= 0 && parts[ei + 1]) return parts[ei + 1];
    }
  } catch {
  }
  return null;
}
async function fetchOembed(endpoint) {
  try {
    const res = await fetch(endpoint, {
      headers: { Accept: "application/json", "User-Agent": "BetskiUI/1.0" },
      signal: AbortSignal.timeout(8e3)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
async function fetchPageHtml(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(1e4)
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
function extractOgMeta(html) {
  const image = html.match(/property=["']og:image(?::url)?["']\s+content=["']([^"']+)["']/i)?.[1] ?? html.match(/content=["']([^"']+)["']\s+property=["']og:image(?::url)?["']/i)?.[1];
  const title = html.match(/property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1] ?? html.match(/content=["']([^"']+)["']\s+property=["']og:title["']/i)?.[1];
  if (!image) return null;
  return { thumbnail_url: image, title };
}
function extractTikTokVideoId(url) {
  const videoMatch = url.match(/\/video\/(\d+)/);
  if (videoMatch) return videoMatch[1];
  const vMatch = url.match(/\/v\/(\d+)/);
  if (vMatch) return vMatch[1];
  try {
    const parsed = new URL(url);
    const fromQuery = parsed.searchParams.get("share_item_id") ?? parsed.searchParams.get("video_id");
    if (fromQuery && /^\d+$/.test(fromQuery)) return fromQuery;
  } catch {
  }
  return null;
}
function getTikTokEmbedUrl(videoId) {
  const params = new URLSearchParams({
    autoplay: "1",
    loop: "1",
    muted: "0",
    music_info: "0",
    description: "0",
    controls: "0",
    progress_bar: "0",
    play_button: "0",
    volume_control: "1",
    fullscreen_button: "0",
    timestamp: "0",
    rel: "0",
    closed_caption: "0",
    native_context_menu: "0"
  });
  return `https://www.tiktok.com/player/v1/${videoId}?${params.toString()}`;
}
async function resolveTikTokCanonicalUrl(url) {
  const lower = url.toLowerCase();
  if (!lower.includes("vm.tiktok.com") && !lower.includes("/t/") && extractTikTokVideoId(url)) {
    try {
      const parsed = new URL(url);
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString();
    } catch {
      return url;
    }
  }
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(1e4)
    });
    const resolved = res.url || url;
    try {
      const parsed = new URL(resolved);
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString();
    } catch {
      return resolved;
    }
  } catch {
    return url;
  }
}
function extractTikTokFromPage(html) {
  const universalMatch = html.match(
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (universalMatch) {
    try {
      const data = JSON.parse(universalMatch[1]);
      const struct = data.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct;
      if (struct?.video) {
        const cover = struct.video.cover ?? struct.video.originCover ?? struct.video.dynamicCover;
        const videoUrl = struct.video.playAddr ?? struct.video.downloadAddr;
        if (cover) {
          return {
            thumb: { thumbnail_url: cover, title: struct.desc },
            stats: extractTikTokStats(struct, html),
            author: extractTikTokAuthor(struct),
            videoUrl: videoUrl || void 0,
            videoId: struct.id
          };
        }
      }
    } catch {
    }
  }
  const sigiMatch = html.match(/<script id="SIGI_STATE" type="application\/json">([\s\S]*?)<\/script>/);
  if (sigiMatch) {
    try {
      const sigi = JSON.parse(sigiMatch[1]);
      const items = sigi.ItemModule ? Object.values(sigi.ItemModule) : [];
      const item = items.find((i) => i?.video?.cover || i?.video?.originCover);
      if (item?.video) {
        const cover = item.video.cover ?? item.video.originCover ?? item.video.dynamicCover;
        if (cover) {
          return {
            thumb: { thumbnail_url: cover, title: item.desc },
            stats: extractTikTokStats(item, html),
            author: extractTikTokAuthor(item),
            videoUrl: item.video.playAddr ?? item.video.downloadAddr,
            videoId: item.id
          };
        }
      }
    } catch {
    }
  }
  const scraped = extractTikTokStats({}, html);
  if (scraped?.playCount != null) {
    const og = extractOgMeta(html);
    if (og?.thumbnail_url) {
      return { thumb: og, stats: scraped };
    }
  }
  return null;
}
async function fetchYoutubeStats(videoId) {
  const apiKey = process.env.YOUTUBE_API_KEY ?? process.env.VITE_YOUTUBE_API_KEY;
  if (!apiKey) return null;
  try {
    const endpoint = `https://www.googleapis.com/youtube/v3/videos?id=${encodeURIComponent(videoId)}&part=statistics&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(8e3) });
    if (!res.ok) return null;
    const data = await res.json();
    const stats = data.items?.[0]?.statistics;
    if (!stats) return null;
    return {
      views: Number(stats.viewCount) || 0,
      likes: Number(stats.likeCount) || 0,
      shares: 0
    };
  } catch {
    return null;
  }
}
function proxiedVideoUrl(original) {
  if (!original || original.startsWith("/api/")) return original;
  return `/api/video-proxy?url=${encodeURIComponent(original)}`;
}
function withProxiedMedia(result) {
  return {
    ...result,
    thumbnailUrl: proxiedThumbnailUrl(result.thumbnailUrl),
    authorAvatarUrl: result.authorAvatarUrl ? proxiedThumbnailUrl(result.authorAvatarUrl) : void 0,
    videoUrl: result.videoUrl ? proxiedVideoUrl(result.videoUrl) : void 0
  };
}
async function resolveLinkPreview(targetUrl) {
  const encoded = encodeURIComponent(targetUrl);
  const lower = targetUrl.toLowerCase();
  if (lower.includes("youtube") || lower.includes("youtu.be")) {
    const videoId = extractYoutubeVideoId(targetUrl);
    if (videoId) {
      const ytStats = await fetchYoutubeStats(videoId);
      const ytOembed = await fetchOembed(`https://www.youtube.com/oembed?url=${encoded}&format=json`);
      return withProxiedMedia({
        thumbnailUrl: ytOembed?.thumbnail_url ?? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        title: ytOembed?.title,
        views: ytStats?.views,
        likes: ytStats?.likes,
        shares: ytStats?.shares,
        embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&playsinline=1`
      });
    }
  }
  if (lower.includes("tiktok")) {
    const canonicalUrl = await resolveTikTokCanonicalUrl(targetUrl);
    const tiktokId = extractTikTokVideoId(canonicalUrl) ?? extractTikTokVideoId(targetUrl);
    const htmlPromise = fetchPageHtml(canonicalUrl);
    const oembedPromise = fetchOembed(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(canonicalUrl)}`
    );
    const [html, tiktokOembed] = await Promise.all([htmlPromise, oembedPromise]);
    const parsed = html ? extractTikTokFromPage(html) : null;
    const thumbUrl = parsed?.thumb.thumbnail_url ?? tiktokOembed?.thumbnail_url;
    const og = html && !thumbUrl ? extractOgMeta(html) : null;
    const s = parsed?.stats ?? (html ? extractTikTokStats({}, html) : void 0);
    const handle = parsed?.author?.authorHandle || extractHandleFromUrl(tiktokOembed?.author_url) || extractHandleFromUrl(canonicalUrl);
    if (thumbUrl || og?.thumbnail_url) {
      return withProxiedMedia({
        thumbnailUrl: thumbUrl ?? og.thumbnail_url,
        title: parsed?.thumb.title ?? tiktokOembed?.title ?? og?.title,
        views: s?.playCount,
        likes: s?.diggCount,
        shares: s?.shareCount,
        comments: s?.commentCount,
        authorName: parsed?.author?.authorName || tiktokOembed?.author_name || void 0,
        authorHandle: handle,
        authorAvatarUrl: parsed?.author?.authorAvatarUrl,
        videoUrl: parsed?.videoUrl,
        embedUrl: tiktokId ? getTikTokEmbedUrl(tiktokId) : void 0
      });
    }
    if (tiktokId) {
      return {
        thumbnailUrl: "",
        embedUrl: getTikTokEmbedUrl(tiktokId),
        title: tiktokOembed?.title,
        authorName: tiktokOembed?.author_name || void 0,
        authorHandle: handle
      };
    }
  }
  if (lower.includes("instagram")) {
    const html = await fetchPageHtml(targetUrl);
    if (html) {
      const ogVideo = html.match(/property=["']og:video(?::url)?["']\s+content=["']([^"']+)["']/i)?.[1] ?? html.match(/content=["']([^"']+)["']\s+property=["']og:video(?::url)?["']/i)?.[1];
      const og = extractOgMeta(html);
      if (og?.thumbnail_url) {
        return withProxiedMedia({
          thumbnailUrl: og.thumbnail_url,
          title: og.title,
          videoUrl: ogVideo ? proxiedVideoUrl(ogVideo) : void 0
        });
      }
    }
  }
  const noembed = await fetchOembed(`https://noembed.com/embed?url=${encoded}`);
  if (noembed?.thumbnail_url) {
    return withProxiedMedia({ thumbnailUrl: noembed.thumbnail_url, title: noembed.title });
  }
  return null;
}
async function fetchThumbnailBuffer(imgUrl) {
  const parsed = new URL(imgUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) return null;
  const upstream = await fetch(imgUrl, {
    headers: {
      "User-Agent": BROWSER_UA,
      Referer: imgUrl.includes("tiktok") ? "https://www.tiktok.com/" : parsed.origin + "/",
      Accept: "image/*,*/*"
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12e3)
  });
  if (!upstream.ok) return null;
  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  const buffer = Buffer.from(await upstream.arrayBuffer());
  return { buffer, contentType };
}
export {
  fetchThumbnailBuffer,
  resolveLinkPreview
};
