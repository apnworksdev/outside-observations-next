import styles from '@app/_assets/lab.module.css';
import LabTypewriter from '@/app/_components/Lab/LabTypewriter';
import LabSubmitProposalLink from '@/app/_components/Lab/LabSubmitProposalLink';
import { getSiteSettings } from '@/app/_data/archive';

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