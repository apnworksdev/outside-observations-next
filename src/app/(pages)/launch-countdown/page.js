import LaunchCountdown from '@/app/_components/LaunchCountdown/LaunchCountdown';
import KlaviyoForm from '@/app/_components/LaunchCountdown/KlaviyoForm';
import styles from '@app/_assets/archive/closed.module.css';
import { client } from '@/sanity/lib/client';
import { SITE_SETTINGS_QUERY } from '@/sanity/lib/queries';
import Image from 'next/image';
import { urlFor } from '@/sanity/lib/image';

// Enable ISR - revalidate every 60 seconds
export const revalidate = 60;

export default async function LaunchCountdownPage() {
  const siteSettings = await client.fetch(SITE_SETTINGS_QUERY);

  return (
    <div className={styles.container}>
      <div className={styles.closedArchiveImageContainer}>
        <Image
          src={urlFor(siteSettings.closedArchiveImage).width(800).url()}
          alt="Launch Countdown"
          width={800}
          height={800}
          className={styles.closedArchiveImage}
          priority
        />
      </div>
      <div className={styles.content}>
        <div className={styles.topContent}>
          <h1>A new chapter of Outside Observations is taking shape.</h1>
          <LaunchCountdown />
        </div>
        <div className={styles.bottomContent}>
          <div className={styles.emailFormContainer}>
            <KlaviyoForm />
            <div className={`${styles.emailInputCircle} ${styles.topLeftCircle}`}></div>
            <div className={`${styles.emailInputCircle} ${styles.topRightCircle}`}></div>
            <div className={`${styles.emailInputCircle} ${styles.bottomLeftCircle}`}></div>
            <div className={`${styles.emailInputCircle} ${styles.bottomRightCircle}`}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

