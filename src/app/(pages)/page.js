import { getSiteSettings } from '@/app/_data/archive';
import HomeContent from '@/app/_components/Home/HomeContent';

// Generate metadata for better SEO
export async function generateMetadata() {
  const siteSettings = await getSiteSettings();
  const siteTitle = siteSettings?.title || 'Outside Observation';
  const description = 'Browse archive entries from Outside Observation';
  
  // Get absolute URL for OpenGraph image (using local file from public folder)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://outside-observation.com';
  const ogImageUrl = `${baseUrl}/share-image.png`;

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
            alt: 'Outside Observation',
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
}

// Enable ISR - revalidate every 60 seconds
export const revalidate = 60;

export default function Home() {
  return <HomeContent />;
}
