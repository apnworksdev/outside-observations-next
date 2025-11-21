import styles from '@app/_assets/home.module.css';

export default function CircleAnimation() {
  const totalCircles = 8;

  return (
    <div className={styles.circleContainer}>
      {Array.from({ length: totalCircles }, (_, index) => (
        <div
          key={index}
          data-number={index + 1}
          className={styles.circle}
        />
      ))}
    </div>
  );
}

