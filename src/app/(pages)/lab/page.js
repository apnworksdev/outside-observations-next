import styles from '@app/_assets/lab.module.css';

export default function LabPage() {
  return (
    <div className={styles.container}>
      <div className={styles.labContent}>
        <h1 className={styles.labTitle}>OUTSIDE OBSERVATIONS’ COLLABORATIVE RESEARCH CENTER</h1>
        <p className={styles.labText1}>A dialogue shaped</p>
        <p className={styles.labText2}>A dialogue shaped</p>
        <p className={styles.labText3}>By daily observations</p>
        <p className={styles.labText4}>By daily observations</p>
        <p className={styles.labText5}>Outside Observations’ collaborative reasearch center</p>
        <p className={styles.labText6}>A space where observation</p>
        <p className={styles.labText7}>Becomes<br />shared practice</p>
        <p className={styles.labText8}>Becomes shared practice</p>
      </div>
      <a href="mailto:info@outsideobservations.com" className={styles.labButtonLink}>
        <div className={styles.labButton}>
          <p>Submit a proposal</p>
        </div>
      </a>
    </div>
  );
}