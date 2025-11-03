import styles from '@app/_assets/lab.module.css';
import LabTypewriter from '@/app/_components/Lab/LabTypewriter';

export default function LabPage() {
  return (
    <div className={styles.container}>
      <div className={styles.labContent}>
        <LabTypewriter />
      </div>
      <a href="mailto:info@outsideobservations.com" className={styles.labButtonLink}>
        <div className={styles.labButton}>
          <p>Submit a proposal</p>
        </div>
      </a>
    </div>
  );
}