import '@app/_assets/variables.css';
import '@app/_assets/globals.css';
import styles from '@app/_assets/main.module.css';
import HeaderNav from '@app/_components/HeaderNav';
import BodyPageTypeUpdater from '@/app/_helpers/BodyPageTypeUpdater';
import BodyHydrationGuard from '@/app/_helpers/BodyHydrationGuard';
import VisitorTracker from '@/app/_helpers/VisitorTracker';
import StudioLayoutWrapper from '@/app/_components/StudioLayoutWrapper';
import { ErrorBoundary } from '@/app/_components/ErrorBoundary';
import { ArchiveSearchStateProvider } from '@/app/_components/Archive/ArchiveSearchStateProvider';
import { VisitorCountProvider } from '@/app/_components/VisitorCountProvider';
import PageTransition from '@/app/_components/PageTransition';

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
          <VisitorCountProvider>
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
                <VisitorTracker />
              </ErrorBoundary>
              <ErrorBoundary>
                <StudioLayoutWrapper />
              </ErrorBoundary>
              <ErrorBoundary>
                <PageTransition>
                  <div data-hide-on-studio="true">
                    <HeaderNav />
                  </div>
                  {children}
                </PageTransition>
              </ErrorBoundary>
            </ArchiveSearchStateProvider>
          </VisitorCountProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}