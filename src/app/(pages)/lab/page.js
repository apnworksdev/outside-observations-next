import styles from '@app/_assets/lab.module.css';
import LabTypewriter from '@/app/_components/Lab/LabTypewriter';
import LabSubmitProposalLink from '@/app/_components/Lab/LabSubmitProposalLink';
import { getSiteSettings } from '@/app/_data/archive';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://outside-observation.com';

export async function generateMetadata() {
  const title = 'Lab | Outside Observation';
  const description =
    'Submit a proposal and collaborate with Outside Observation. Get in touch for new projects and ideas.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${baseUrl}/lab`,
      images: [
        {
          url: `${baseUrl}/share-image.png`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}/share-image.png`],
    },
    alternates: { canonical: `${baseUrl}/lab` },
  };
}

export default async function LabPage() {
  const siteSettings = await getSiteSettings();
  const labQuote = siteSettings?.labQuote || '';

  return (
    <div className={styles.container}>
      <div className={styles.labContent}>
        <LabTypewriter />
      </div>

      <div className={styles.labQuote}>
        {labQuote && <p>{labQuote}</p>}
      </div>

      <LabSubmitProposalLink />
    </div>
  );
}