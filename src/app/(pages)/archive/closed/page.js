import Countdown from '@/app/_components/Countdown/Countdown';
import ArchiveClosedViewTracker from '@/app/_components/Archive/ArchiveClosedViewTracker';
import NoRightClickWrapper from '@/app/_components/NoRightClickWrapper';
import styles from '@app/_assets/archive/closed.module.css';
import { getSiteSettings } from '@/app/_data/archive';
import Image from 'next/image';
import { urlFor } from '@/sanity/lib/image';

// Enable ISR - revalidate every 60 seconds
export const revalidate = 60;

export async function generateMetadata() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://outside-observation.com';
  const canonicalUrl = `${baseUrl}/archive/closed`;
  const title = 'Archive closed | Outside Observation';
  const description =
    'The archive is resting. Access hours 09:00–17:00. Outside Observation.';

  let ogImageUrl = `${baseUrl}/share-image.png`;
  try {
    const siteSettings = await getSiteSettings();
    if (siteSettings?.closedArchiveImage) {
      ogImageUrl = urlFor(siteSettings.closedArchiveImage).width(1200).height(630).fit('max').url();
    }
  } catch {
    // use default share image
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonicalUrl,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
    alternates: { canonical: canonicalUrl },
  };
}

export default async function ClosedPage() {
  const siteSettings = await getSiteSettings();
  const closedImage = siteSettings?.closedArchiveImage;
  const imageSrc = closedImage
    ? urlFor(closedImage).width(800).url()
    : '/share-image.png';

  return (
    <div className={styles.container}>
      <ArchiveClosedViewTracker />
      <div className={styles.closedArchiveImageContainer}>
        <NoRightClickWrapper>
          <Image
            src={imageSrc}
            alt="Closed Archive"
            width={800}
            height={800}
            className={styles.closedArchiveImage}
            priority
            draggable={false}
          />
        </NoRightClickWrapper>
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

