import { getSiteSettings } from '@/app/_data/archive';
import HomeContent from '@/app/_components/Home/HomeContent';

// Generate metadata for better SEO
export async function generateMetadata() {
  const siteSettings = await getSiteSettings();
  const siteTitle = siteSettings?.title || 'Outside Observation';
  const description =
    'A new chapter of Outside Observations. Explore the archive and discover unexpected connections.';

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://outside-observation.com';
  const ogImageUrl = `${baseUrl}/share-image.png`;

  return {
    title: siteTitle,
    description,
    openGraph: {
      title: siteTitle,
      description,
      type: 'website',
      url: baseUrl,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: siteTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: siteTitle,
      description,
      images: [ogImageUrl],
    },
    alternates: { canonical: baseUrl },
  };
}

// Enable ISR - revalidate every 60 seconds
export const revalidate = 60;

export default async function Home() {
  const siteSettings = await getSiteSettings();
  const homeImage = siteSettings?.homeImage;
  const dimensions = homeImage?.dimensions;
  const homeImageWidth = dimensions?.width ?? 1200;
  const homeImageHeight = dimensions?.height ?? undefined;
  const homeTitle = siteSettings?.newsletter?.title ?? undefined;
  const homeDescription = siteSettings?.newsletter?.description ?? undefined;

  return (
    <HomeContent
      homeImage={homeImage}
      homeImageWidth={homeImageWidth}
      homeImageHeight={homeImageHeight}
      homeTitle={homeTitle}
      homeDescription={homeDescription}
    />
  );
}
