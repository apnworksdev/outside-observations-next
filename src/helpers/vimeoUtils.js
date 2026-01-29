/**
 * True if the URL is a Vimeo direct video file (e.g. progressive_redirect/.../file.mp4).
 * Only direct file URLs are supported; use this as the video source with native <video>.
 * If vimeoUrl is set but not a direct file, we fall back to the normal Sanity video.
 */
export function isVimeoDirectFileUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const u = url.trim();
  return (
    u.includes('progressive_redirect') ||
    u.includes('/rendition/') ||
    u.endsWith('.mp4') ||
    /\.mp4\?/.test(u)
  );
}
