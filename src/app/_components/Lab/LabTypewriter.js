'use client';

import { useEffect, useState, useRef } from 'react';
import styles from '@app/_assets/lab.module.css';

const fullTexts = {
  title: "OUTSIDE OBSERVATIONS' COLLABORATIVE RESEARCH CENTER",
  text1: "A dialogue shaped",
  text2: "A dialogue shaped",
  text3: "By daily observations",
  text4: "By daily observations",
  text5: "Outside Observations' collaborative reasearch center",
  text6: "A space where observation",
  text7: "Becomes\nshared practice",
  text8: "Becomes shared practice",
};

export default function LabTypewriter() {
  const [displayedTexts, setDisplayedTexts] = useState({
    title: '',
    text1: '',
    text2: '',
    text3: '',
    text4: '',
    text5: '',
    text6: '',
    text7: '',
    text8: '',
  });

  const timeoutRefs = useRef([]);
  const intervalRefs = useRef([]);

  useEffect(() => {
    const typewriterSpeed = 70; // milliseconds per character
    const textDelays = {
      title: 2100,
      text1: 1100,
      text2: 4000,
      text3: 3200,
      text4: 2400,
      text5: 700,
      text6: 3800,
      text7: 2600,
      text8: 0,
    };

    Object.keys(fullTexts).forEach((key) => {
      const fullText = fullTexts[key];
      const delay = textDelays[key];
      
      const timeoutId = setTimeout(() => {
        let currentIndex = 0;
        
        const intervalId = setInterval(() => {
          if (currentIndex <= fullText.length) {
            setDisplayedTexts((prev) => ({
              ...prev,
              [key]: fullText.slice(0, currentIndex),
            }));
            currentIndex++;
          } else {
            clearInterval(intervalId);
          }
        }, typewriterSpeed);
        
        intervalRefs.current.push(intervalId);
      }, delay);
      
      timeoutRefs.current.push(timeoutId);
    });

    return () => {
      timeoutRefs.current.forEach((id) => clearTimeout(id));
      intervalRefs.current.forEach((id) => clearInterval(id));
      timeoutRefs.current = [];
      intervalRefs.current = [];
    };
  }, []);

  return (
    <>
      <h1 className={styles.labTitle}>
        <span style={{ visibility: 'hidden', display: 'inline-block', width: '100%' }}>{fullTexts.title}</span>
        <span style={{ position: 'absolute', left: 0, top: 0, width: '100%', textAlign: 'center' }}>{displayedTexts.title}</span>
      </h1>
      <p className={styles.labText1}>
        <span style={{ visibility: 'hidden', display: 'inline-block' }}>{fullTexts.text1}</span>
        <span style={{ position: 'absolute', left: 0, top: 0 }}>{displayedTexts.text1}</span>
      </p>
      <p className={styles.labText2}>
        <span style={{ visibility: 'hidden', display: 'inline-block' }}>{fullTexts.text2}</span>
        <span style={{ position: 'absolute', left: 0, top: 0 }}>{displayedTexts.text2}</span>
      </p>
      <p className={styles.labText3}>
        <span style={{ visibility: 'hidden', display: 'inline-block', width: '100%' }}>{fullTexts.text3}</span>
        <span style={{ position: 'absolute', left: 0, top: 0, width: '100%', textAlign: 'right' }}>{displayedTexts.text3}</span>
      </p>
      <p className={styles.labText4}>
        <span style={{ visibility: 'hidden', display: 'inline-block' }}>{fullTexts.text4}</span>
        <span style={{ position: 'absolute', left: 0, top: 0 }}>{displayedTexts.text4}</span>
      </p>
      <p className={styles.labText5}>
        <span style={{ visibility: 'hidden', display: 'inline-block', width: '100%' }}>{fullTexts.text5}</span>
        <span style={{ position: 'absolute', left: 0, top: 0, width: '100%', textAlign: 'center' }}>{displayedTexts.text5}</span>
      </p>
      <p className={styles.labText6}>
        <span style={{ visibility: 'hidden', display: 'inline-block', width: '100%' }}>{fullTexts.text6}</span>
        <span style={{ position: 'absolute', left: 0, top: 0, width: '100%' }}>{displayedTexts.text6}</span>
      </p>
      <p className={styles.labText7}>
        <span style={{ visibility: 'hidden', display: 'inline-block', width: '100%', whiteSpace: 'pre-line' }}>{fullTexts.text7}</span>
        <span style={{ position: 'absolute', left: 0, top: 0, width: '100%', textAlign: 'center' }}>
          {displayedTexts.text7.split('\n').map((line, index, array) => (
            <span key={index}>
              {line}
              {index < array.length - 1 && <br />}
            </span>
          ))}
        </span>
      </p>
      <p className={styles.labText8}>
        <span style={{ visibility: 'hidden', display: 'inline-block' }}>{fullTexts.text8}</span>
        <span style={{ position: 'absolute', left: 0, top: 0 }}>{displayedTexts.text8}</span>
      </p>
    </>
  );
}

