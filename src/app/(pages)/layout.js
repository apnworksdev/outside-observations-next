import '@app/_assets/variables.css';
import '@app/_assets/globals.css';
import styles from '@app/_assets/main.module.css';
import HeaderNav from '@app/_components/HeaderNav';
import BodyPageTypeUpdater from '@/app/_helpers/BodyPageTypeUpdater';
import BodyFadeIn from '@/app/_helpers/BodyFadeIn';
import StudioLayoutWrapper from '@/app/_components/StudioLayoutWrapper';
import { headers } from 'next/headers';

export const metadata = {
  title: 'Outside Observation',
  description: 'Outside Observation',
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

  return (
    <html lang="en">
      <body data-page={pageType}>
        <BodyPageTypeUpdater />
        <BodyFadeIn />
        <StudioLayoutWrapper />
        {/* HeaderNav commented out - hiding for launch countdown */}
        {/* <div data-hide-on-studio="true">
          <HeaderNav />
        </div> */}
        {children}
        <div data-hide-on-studio="true">
          <div className={styles.linesGrid}>
            {Array.from({ length: 5 }).map((_, index) => (
              <div className={styles.linesGridItem} key={index} />
            ))}
          </div>
        </div>
      </body>
    </html>
  );
}