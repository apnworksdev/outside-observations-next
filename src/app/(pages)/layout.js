import "@app/_assets/variables.css";
import "@app/_assets/globals.css";
import styles from "@app/_assets/main.module.css";
import HeaderNav from '@app/_components/HeaderNav';
import BodyPageTypeUpdater from '@/app/_helpers/BodyPageTypeUpdater';
import { headers } from 'next/headers';

export const metadata = {
  title: "Outside Observation",
  description: "Outside Observation",
};

export default async function RootLayout({ children }) {
  const headersList = await headers();
  const pageType = headersList.get('x-page-type') || 'home';

  return (
    <html lang="en">
      <body data-page={pageType}>
        <BodyPageTypeUpdater />
        <HeaderNav />
        {children}
        <div className={styles.linesGrid}>
          {Array.from({ length: 5 }).map((_, index) => (
            <div className={styles.linesGridItem} key={index}></div>
          ))}
        </div>
      </body>
    </html>
  );
}
