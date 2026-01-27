import Countdown from '@/app/_components/Countdown/Countdown';
import ArchiveClosedViewTracker from '@/app/_components/Archive/ArchiveClosedViewTracker';
import styles from '@app/_assets/archive/closed.module.css';
import { getSiteSettings } from '@/app/_data/archive';
import Image from 'next/image';
import { urlFor } from '@/sanity/lib/image';

// Enable ISR - revalidate every 60 seconds
export const revalidate = 60;

export default async function ClosedPage() {
  const siteSettings = await getSiteSettings();

  return (
    <div className={styles.container}>
      <ArchiveClosedViewTracker />
      <div className={styles.closedArchiveImageContainer}>
        <Image
          src={urlFor(siteSettings.closedArchiveImage).width(800).url()}
          alt="Closed Archive"
          width={800}
          height={800}
          className={styles.closedArchiveImage}
          priority
        />
      </div>
      <div className={styles.content}>
        <div className={styles.topContent}>
          <h1 className={styles.title}>The archive will open in:</h1>
          <Countdown />
        </div>
        <div className={styles.bottomContent}>
          <p className={styles.description}>The archive is resting for the night.</p>
          <br />
          <p className={styles.description}>Access hours</p>
          <p className={styles.description}>09:00-17:00 (GMT-7)</p>
        </div>
      </div>
    </div>
  );
}

