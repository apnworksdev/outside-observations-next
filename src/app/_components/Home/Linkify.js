'use client';

/**
 * Renders text with http(s) URLs and email addresses as clickable links.
 * - URLs open in a new tab (target="_blank" rel="noopener noreferrer")
 * - Emails become mailto: links
 */
export default function Linkify({ children, className }) {
  const text = typeof children === 'string' ? children : '';
  if (!text) return null;

  const urlRegex = /https?:\/\/[^\s]+/g;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  const matches = [];
  let m;
  urlRegex.lastIndex = 0;
  while ((m = urlRegex.exec(text)) !== null) {
    const raw = m[0];
    const trimmed = raw.replace(/[.,;:)!?]+$/, '');
    matches.push({
      start: m.index,
      end: m.index + raw.length,
      type: 'url',
      display: raw,
      href: trimmed,
    });
  }
  emailRegex.lastIndex = 0;
  while ((m = emailRegex.exec(text)) !== null) {
    const insideUrl = matches.some(
      (x) => x.type === 'url' && m.index >= x.start && m.index < x.end
    );
    if (!insideUrl) {
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        type: 'email',
        display: m[0],
        href: `mailto:${m[0]}`,
      });
    }
  }
  matches.sort((a, b) => a.start - b.start);

  const nonOverlapping = [];
  for (const match of matches) {
    if (nonOverlapping.length && match.start < nonOverlapping[nonOverlapping.length - 1].end) {
      continue;
    }
    nonOverlapping.push(match);
  }

  const segments = [];
  let lastEnd = 0;
  for (const match of nonOverlapping) {
    if (match.start > lastEnd) {
      segments.push({ type: 'text', value: text.slice(lastEnd, match.start) });
    }
    segments.push({
      type: 'link',
      value: match.display,
      href: match.href,
      external: match.type === 'url',
    });
    lastEnd = match.end;
  }
  if (lastEnd < text.length) {
    segments.push({ type: 'text', value: text.slice(lastEnd) });
  }

  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.type === 'text' ? (
          <span key={i}>{seg.value}</span>
        ) : seg.external ? (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {seg.value}
          </a>
        ) : (
          <a key={i} href={seg.href}>
            {seg.value}
          </a>
        )
      )}
    </span>
  );
}
