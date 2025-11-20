import LaunchCountdown from '@/app/_components/LaunchCountdown/LaunchCountdown';
import KlaviyoForm from '@/app/_components/LaunchCountdown/KlaviyoForm';
import BlurredImage from '@/app/_components/LaunchCountdown/BlurredImage';
import styles from '@app/_assets/archive/closed.module.css';
import { client } from '@/sanity/lib/client';
import { SITE_SETTINGS_QUERY } from '@/sanity/lib/queries';
import { urlFor } from '@/sanity/lib/image';

// Generate metadata for better SEO
export async function generateMetadata() {
  const siteSettings = await client.fetch(SITE_SETTINGS_QUERY);
  const siteTitle = siteSettings?.title || 'Outside Observation';
  const description = 'A new chapter of Outside Observations is taking shape. Stay updated on our upcoming launch.';
  
  // Get absolute URL for OpenGraph image (using local file from public folder)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://outside-observation.com';
  const ogImageUrl = `${baseUrl}/share-image.png`; // Change 'og-image.png' to your actual filename

  return {
    title: siteTitle,
    description,
    openGraph: {
      title: siteTitle,
      description,
      type: 'website',
      ...(ogImageUrl && {
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: 'Outside Observation Launch',
          },
        ],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: siteTitle,
      description,
      ...(ogImageUrl && {
        images: [ogImageUrl],
      }),
    },
  };
};

// Enable ISR - revalidate every 60 seconds
export const revalidate = 60;

export default async function Home() {
  const siteSettings = await client.fetch(SITE_SETTINGS_QUERY);

  // Original homepage content - commented out
  // return (
  //   <div>
  //     <h1>Outside Observation</h1>
  //   </div>
  // );

  // Structured data for better SEO
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://outside-observation.com';
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteSettings?.title || 'Outside Observation',
    description: 'A new chapter of Outside Observations is taking shape. Stay updated on our upcoming launch.',
    url: baseUrl,
  };

  // Check if image exists before rendering
  const hasImage = siteSettings?.closedArchiveImage;

  return (
    <>
      {/* Structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className={styles.container}>
        {hasImage && (
          <div className={styles.closedArchiveImageContainer}>
            <BlurredImage
              src={urlFor(siteSettings.closedArchiveImage).width(800).url()}
              alt="Outside Observation - Launch Countdown"
              width={800}
              height={800}
              priority
              fetchPriority="high"
              quality={90}
            />
          </div>
        )}
        <div className={styles.content}>
          <div className={styles.topContent}>
            <h1 className={styles.title}>A new chapter of Outside Observations is taking shape.</h1>
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
    </>
  );
};
