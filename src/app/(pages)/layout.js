import '@app/_assets/variables.css';
import '@app/_assets/globals.css';
import styles from '@app/_assets/main.module.css';
import HeaderNav from '@app/_components/HeaderNav';
import BodyPageTypeUpdater from '@/app/_helpers/BodyPageTypeUpdater';
import BodyFadeIn from '@/app/_helpers/BodyFadeIn';
import BodyHydrationGuard from '@/app/_helpers/BodyHydrationGuard';
import StudioLayoutWrapper from '@/app/_components/StudioLayoutWrapper';
import { ErrorBoundary } from '@/app/_components/ErrorBoundary';
import { ArchiveSearchStateProvider } from '@/app/_components/Archive/ArchiveSearchStateProvider';

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

export default function RootLayout({ children }) {
  // Page type is set client-side by BodyPageTypeUpdater component
  // This allows static generation while still setting the correct data-page attribute
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <BodyHydrationGuard />
          <ArchiveSearchStateProvider>
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
          </ArchiveSearchStateProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}