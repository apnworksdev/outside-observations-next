import '@app/_assets/variables.css';
import '@app/_assets/globals.css';
import styles from '@app/_assets/main.module.css';
import Script from 'next/script';
import HeaderNav from '@app/_components/HeaderNav';
import BodyPageTypeUpdater from '@/app/_helpers/BodyPageTypeUpdater';
import BodyHydrationGuard from '@/app/_helpers/BodyHydrationGuard';
import VisitorTracker from '@/app/_helpers/VisitorTracker';
import WebsiteVisitTracker from '@/app/_helpers/WebsiteVisitTracker';
import StudioLayoutWrapper from '@/app/_components/StudioLayoutWrapper';
import { ErrorBoundary } from '@/app/_components/ErrorBoundary';
import { ArchiveSearchStateProvider } from '@/app/_components/Archive/ArchiveSearchStateProvider';
import { VisitorCountProvider } from '@/app/_components/VisitorCountProvider';
import { RadioIframeProvider } from '@/app/_components/RadioIframeProvider';
import { ContentWarningConsentProvider } from '@/app/_contexts/ContentWarningConsentContext';
import RadioIframe from '@/app/_components/RadioIframe';
import PageTransition from '@/app/_components/PageTransition';
import PageSectionTracker from '@/app/_components/PageSectionTracker';
import { GA4_MEASUREMENT_ID } from '@/app/_helpers/gtag';

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
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-config" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA4_MEASUREMENT_ID}');
          `}
        </Script>
        <ErrorBoundary>
          <BodyHydrationGuard />
          <VisitorCountProvider>
            <RadioIframeProvider>
              <ContentWarningConsentProvider>
                <ArchiveSearchStateProvider>
                <ErrorBoundary>
                  <BodyPageTypeUpdater />
                </ErrorBoundary>
                <ErrorBoundary>
                  <PageSectionTracker />
                </ErrorBoundary>
                <ErrorBoundary>
                  <VisitorTracker />
                </ErrorBoundary>
                <ErrorBoundary>
                  <WebsiteVisitTracker />
                </ErrorBoundary>
                <ErrorBoundary>
                  <StudioLayoutWrapper />
                </ErrorBoundary>
                <ErrorBoundary>
                  <RadioIframe />
                </ErrorBoundary>
                <ErrorBoundary>
                  <PageTransition>
                    <div data-hide-on-studio="true" data-first-visit-animate="header">
                      <HeaderNav />
                    </div>
                    <div className={styles.linesGrid} data-first-visit-animate="lines" id="lines-grid" data-hide-on-studio="true">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div className={styles.linesGridItem} key={index} />
                      ))}
                    </div>
                    {children}
                  </PageTransition>
                </ErrorBoundary>
                </ArchiveSearchStateProvider>
              </ContentWarningConsentProvider>
            </RadioIframeProvider>
          </VisitorCountProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}