import styles from '@app/_assets/lab.module.css';
import LabTypewriter from '@/app/_components/Lab/LabTypewriter';
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

      <a href="mailto:contact@outsideobservations.com" className={styles.labButtonLink}>
        <div className={styles.labButton}>
          <p>Submit a proposal</p>
        </div>
      </a>
    </div>
  );
}