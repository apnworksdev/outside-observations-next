import '@app/_assets/variables.css';
import '@app/_assets/globals.css';
import styles from '@app/_assets/main.module.css';
import HeaderNav from '@app/_components/HeaderNav';
import BodyPageTypeUpdater from '@/app/_helpers/BodyPageTypeUpdater';
import BodyFadeIn from '@/app/_helpers/BodyFadeIn';
import StudioLayoutWrapper from '@/app/_components/StudioLayoutWrapper';
import ArchiveEntriesProvider from '@/app/_components/Archive/ArchiveEntriesProvider';
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
  const headersList = await headers();
  const pageType = headersList.get('x-page-type') || 'home';
  const entries = await getArchiveEntries();
  const cookieStore = await cookies();
  const viewCookie = cookieStore.get(VIEW_COOKIE_NAME)?.value ?? null;

  return (
    <html lang="en">
      <body data-page={pageType}>
        <ArchiveEntriesProvider initialEntries={entries} initialView={viewCookie}>
          <div data-hide-on-studio="true">
            <div className={styles.linesGrid}>
              {Array.from({ length: 5 }).map((_, index) => (
                <div className={styles.linesGridItem} key={index} />
              ))}
            </div>
          </div>
          <BodyPageTypeUpdater />
          <BodyFadeIn />
          <StudioLayoutWrapper />
          <div data-hide-on-studio="true">
            <HeaderNav />
          </div>
          {children}
        </ArchiveEntriesProvider>
      </body>
    </html>
  );
}