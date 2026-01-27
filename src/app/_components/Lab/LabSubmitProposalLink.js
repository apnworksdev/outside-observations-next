'use client';

import { trackLabSubmitProposalClick } from '@/app/_helpers/gtag';
import styles from '@app/_assets/lab.module.css';

const MAILTO = 'mailto:contact@outsideobservations.com';

export default function LabSubmitProposalLink() {
  return (
    <a
      href={MAILTO}
      className={styles.labButtonLink}
      onClick={() => trackLabSubmitProposalClick()}
    >
      <div className={styles.labButton}>
        <p>Submit a proposal</p>
      </div>
    </a>
  );
}
