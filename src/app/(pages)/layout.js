import '@app/_assets/variables.css';
import '@app/_assets/globals.css';
import styles from '@app/_assets/main.module.css';
import HeaderNav from '@app/_components/HeaderNav';
import BodyPageTypeUpdater from '@/app/_helpers/BodyPageTypeUpdater';
import BodyFadeIn from '@/app/_helpers/BodyFadeIn';
import StudioLayoutWrapper from '@/app/_components/StudioLayoutWrapper';
import ArchiveEntriesProvider from '@/app/_components/Archive/ArchiveEntriesProvider';
import { ErrorBoundary } from '@/app/_components/ErrorBoundary';
import { getArchiveEntries } from '@app/_data/archive';
import { cookies } from 'next/headers';
import { headers } from 'next/headers';

const VIEW_COOKIE_NAME = 'outside-observations-archive-view';

export const metadata = {
  title: 'Outside Observation',
  description: 'A new chapter of Outside Observations is taking shape. Stay updated on our upcoming launch.',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
};

export default async function RootLayout({ children }) {
  let pageType = 'home';
  let entries = [];
  let viewCookie = null;

  try {
    const headersList = await headers();
    pageType = headersList.get('x-page-type') || 'home';
  } catch (error) {
    console.error('Failed to get headers:', error);
    // Continue with default pageType
  }

  try {
    entries = await getArchiveEntries();
    // Ensure entries is an array
    if (!Array.isArray(entries)) {
      console.warn('getArchiveEntries returned non-array, using empty array');
      entries = [];
    }
  } catch (error) {
    console.error('Failed to fetch archive entries in layout:', error);
    // Continue with empty array - components should handle this gracefully
    entries = [];
  }

  try {
    const cookieStore = await cookies();
    viewCookie = cookieStore.get(VIEW_COOKIE_NAME)?.value ?? null;
  } catch (error) {
    console.error('Failed to read cookies:', error);
    // Continue with null - components should handle this gracefully
    viewCookie = null;
  }

  return (
    <html lang="en">
      <body data-page={pageType}>
        <ErrorBoundary>
          <ArchiveEntriesProvider initialEntries={entries} initialView={viewCookie}>
            <ErrorBoundary>
              <div data-hide-on-studio="true">
                <div className={styles.linesGrid}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div className={styles.linesGridItem} key={index} />
                  ))}
                </div>
              </div>
            </ErrorBoundary>
            <ErrorBoundary>
              <BodyPageTypeUpdater />
            </ErrorBoundary>
            <ErrorBoundary>
              <BodyFadeIn />
            </ErrorBoundary>
            <ErrorBoundary>
              <StudioLayoutWrapper />
            </ErrorBoundary>
            <ErrorBoundary>
              <div data-hide-on-studio="true">
                <HeaderNav />
              </div>
            </ErrorBoundary>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </ArchiveEntriesProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}