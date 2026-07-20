const PROXY_HOST_PATTERNS = [
  "tiktokcdn",
  "tiktokv.com",
  "ttlivecdn",
  "muscdn",
  "byteoversea",
  "ibyteimg",
  "cdninstagram",
  "fbcdn.net",
  "instagram.com",
  "googleusercontent.com"
];
function needsThumbnailProxy(url) {
  if (!url) return false;
  if (url.startsWith("/cache/thumbnails/")) return false;
  if (url.startsWith("/") || url.startsWith("data:")) return false;
  if (url.startsWith("/api/thumbnail-proxy")) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return PROXY_HOST_PATTERNS.some((pattern) => host.includes(pattern));
  } catch {
    return false;
  }
}
function proxiedThumbnailUrl(url) {
  if (!url) return "/Stems/BetskiPEFFPEE.png";
  if (url.startsWith("/cache/thumbnails/")) return url;
  if (url.startsWith("data:")) return url;
  if (url.startsWith("/api/thumbnail-proxy")) return url;
  if (url.startsWith("/") && !url.startsWith("/api/")) return url;
  if (needsThumbnailProxy(url)) {
    return `/api/thumbnail-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}
export {
  proxiedThumbnailUrl
};
