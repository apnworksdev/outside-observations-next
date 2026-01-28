'use client';

/**
 * Wraps content (e.g. an image) to prevent right-click context menu (Save Image As, etc.).
 * Use in server-rendered pages where the inner content is not a client image component.
 */
export default function NoRightClickWrapper({ children, className, style }) {
  return (
    <span
      className={className}
      style={{ display: 'inline-block', ...style }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </span>
  );
}
