import styles from '@app/_assets/privacy.module.css';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://outside-observation.com';

export async function generateMetadata() {
  const title = 'Privacy & cookies | Outside Observation';
  const description =
    'How we use cookies and handle your data when you use this website.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${baseUrl}/privacy`,
    },
    alternates: { canonical: `${baseUrl}/privacy` },
  };
}

export default function PrivacyPage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>

        <h1 className={styles.title}>Privacy & cookies</h1>

        <section className={styles.section}>
          <h2 className={styles.heading}>Cookies</h2>
          <p>
            We use cookies only for <strong>analytics</strong> (Google Analytics 4), to understand how the site is used—for example which pages are visited and how you move through the site. We do not use cookies for advertising or to identify you personally.
          </p>
          <p>
            When you first visit, you can <strong>Accept</strong> or <strong>Reject</strong> analytics cookies via the consent banner. If you reject, we do not set analytics cookies; Google may still receive limited, non-identifying data (cookieless pings) for measurement. Your choice is stored locally in your browser and remains until you clear site data or change your preference.
          </p>
          <p>
            You can change your mind at any time by clearing this site’s data in your browser settings, or by deleting cookies for this domain. After that, the cookie banner will appear again on your next visit.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>Data we collect</h2>
          <p>
            When analytics cookies are accepted, Google Analytics 4 may collect information such as pages viewed, approximate location (country), device type, and how you interact with the site. This data is used in aggregated form to improve the website. Google’s use of data is described in{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className={styles.link}>
              Google’s Privacy Policy
            </a>.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>Your rights</h2>
          <p>
            Depending on where you are, you may have the right to access, correct, or delete your data, or to object to or restrict processing. To exercise these rights or ask questions, please contact us at <a href="mailto:contact@outside-observation.com" className={styles.link}>contact@outside-observation.com</a>.
          </p>
        </section>

        <p className={styles.updated}>
          This page was last updated to reflect our use of cookies and consent banner. We may update it from time to time.
        </p>
      </div>
    </div>
  );
}
