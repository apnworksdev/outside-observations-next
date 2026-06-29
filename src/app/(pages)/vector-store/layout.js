/**
 * Layout for the vector-store dev tool.
 * Prevents search engines from indexing this page (dev/debug only).
 */
import { SITE_NAME } from '@/lib/siteUrl';

export const metadata = {
  title: `Vector Store (dev) | ${SITE_NAME}`,
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function VectorStoreLayout({ children }) {
  return children;
}
