import '@app/_assets/variables.css';
import '@app/_assets/globals.css';
import styles from '@app/_assets/main.module.css';
import Script from 'next/script';
import HeaderNav from '@app/_components/layout/HeaderNav';
import { getSiteSettings } from '@/app/_data/archive';
import BodyPageTypeUpdater from '@/app/_helpers/dom/BodyPageTypeUpdater';
import BodyHydrationGuard from '@/app/_helpers/dom/BodyHydrationGuard';
import VisitorTracker from '@/app/_helpers/tracking/VisitorTracker';
import StudioLayoutWrapper from '@/app/_components/layout/StudioLayoutWrapper';
import { ErrorBoundary } from '@/app/_components/shared/error/ErrorBoundary';
import { ArchiveSearchStateProvider } from '@/app/_components/Archive/providers/ArchiveSearchStateProvider';
import { VisitorCountProvider } from '@/app/_components/shared/VisitorCountProvider';
import { RadioIframeProvider } from '@/app/_components/shared/RadioIframeProvider';
import { ContentWarningConsentProvider } from '@/app/_contexts/archive/ContentWarningConsentContext';
import { MoodPanelProvider } from '@/app/_contexts/archive/MoodPanelContext';
import RadioIframe from '@/app/_components/shared/RadioIframe';
import PageTransition from '@/app/_components/layout/PageTransition';
import PageSectionTracker from '@/app/_components/shared/PageSectionTracker';
import CookieConsentBanner from '@/app/_components/shared/CookieConsentBanner';
import FirstVisitIntro from '@/app/_components/Home/FirstVisitIntro';
import { GA4_MEASUREMENT_ID } from '@/app/_helpers/analytics/gtag';
import { SITE_NAME, SITE_URL } from '@/lib/siteUrl';

export const metadata = {
  title: SITE_NAME,
  description: 'A new chapter of Outside Observations. Explore the archive and discover unexpected connections.',
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

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/archive?search={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

export default async function RootLayout({ children }) {
  const siteSettings = await getSiteSettings();
  const newsletterTitle = siteSettings?.newsletter?.title ?? undefined;
  const newsletterDescription = siteSettings?.newsletter?.description ?? undefined;

  // Page type is set client-side by BodyPageTypeUpdater component
  // This allows static generation while still setting the correct data-page attribute
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {/* Consent default must run before gtag so GA4 respects it (Consent Mode v2) */}
        <Script id="ga4-consent-default" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            try {
              var allowed = window.localStorage.getItem('cookie_consent_analytics') === 'true';
              gtag('consent', 'default', { analytics_storage: allowed ? 'granted' : 'denied' });
            } catch (e) {
              gtag('consent', 'default', { analytics_storage: 'denied' });
            }
          `}
        </Script>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-config" strategy="afterInteractive">
          {`
            gtag('js', new Date());
            gtag('config', '${GA4_MEASUREMENT_ID}');
          `}
        </Script>
        <Script id="intro-flash-guard" strategy="beforeInteractive">
          {`try{if(!localStorage.getItem('has_visited_website'))document.documentElement.setAttribute('data-intro','pending')}catch(e){}`}
        </Script>
        <ErrorBoundary>
          <FirstVisitIntro />
        </ErrorBoundary>
        <ErrorBoundary>
          <BodyHydrationGuard />
          <VisitorCountProvider>
            <RadioIframeProvider>
              <ContentWarningConsentProvider>
                <ArchiveSearchStateProvider>
                <MoodPanelProvider>
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
                  <StudioLayoutWrapper />
                </ErrorBoundary>
                <ErrorBoundary>
                  <RadioIframe />
                </ErrorBoundary>
                <ErrorBoundary>
                  <PageTransition>
                    <div data-hide-on-studio="true" data-first-visit-animate="header">
                      <HeaderNav
                        newsletterTitle={newsletterTitle}
                        newsletterDescription={newsletterDescription}
                      />
                    </div>
                    <div className={styles.linesGrid} data-first-visit-animate="lines" id="lines-grid" data-hide-on-studio="true">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div className={styles.linesGridItem} key={index} />
                      ))}
                    </div>
                    {children}
                  </PageTransition>
                </ErrorBoundary>
                </MoodPanelProvider>
                </ArchiveSearchStateProvider>
              </ContentWarningConsentProvider>
            </RadioIframeProvider>
          </VisitorCountProvider>
          <ErrorBoundary>
            <CookieConsentBanner />
          </ErrorBoundary>
        </ErrorBoundary>
      </body>
    </html>
  );
}