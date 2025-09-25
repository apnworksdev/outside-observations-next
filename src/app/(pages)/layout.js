import "@app/_assets/variables.css";
import "@app/_assets/globals.css";
import styles from "@app/_assets/main.module.css";

export const metadata = {
  title: "Outside Observation",
  description: "Outside Observation",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <div className={styles.linesGrid}>
          <div className={styles.linesGridColumn}></div>
          <div className={styles.linesGridItem}></div>
          <div className={styles.linesGridColumn}></div>
          <div className={styles.linesGridItem}></div>
          <div className={styles.linesGridColumn}></div>
          <div className={styles.linesGridItem}></div>
          <div className={styles.linesGridColumn}></div>
          <div className={styles.linesGridItem}></div>
          <div className={styles.linesGridColumn}></div>
          <div className={styles.linesGridItem}></div>
          <div className={styles.linesGridColumn}></div>
        </div>
      </body>
    </html>
  );
}
