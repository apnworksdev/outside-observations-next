import styles from '@app/_assets/lab/lab.module.css';
import LabTypewriter from '@/app/_components/Lab/LabTypewriter';
import LabSubmitProposalLink from '@/app/_components/Lab/LabSubmitProposalLink';
import { getSiteSettings } from '@/app/_data/archive';
import { SITE_NAME, SITE_URL } from '@/lib/siteUrl';

const baseUrl = SITE_URL;

export async function generateMetadata() {
  const title = `Lab | ${SITE_NAME}`;
  const description =
    `Submit a proposal and collaborate with ${SITE_NAME}. Get in touch for new projects and ideas.`;

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