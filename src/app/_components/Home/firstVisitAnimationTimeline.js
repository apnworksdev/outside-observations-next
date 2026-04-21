import { gsap } from 'gsap';

export function setupFirstVisitTimeline({
  timing,
  timeline,
  contentRef,
  createTextRef,
  investTextRef,
  longTextRef,
}) {
  const content = contentRef.current;
  const createText = createTextRef.current;
  const investText = investTextRef.current;
  const longText = longTextRef.current;
  if (!content || !createText || !investText || !longText || !timeline) return;

  const textFadeDuration = 0.5;
  const longTextDisplayDuration = 2.5;
  const longTextDelay = 0.6;
  const circleDuration = 0.6;
  const circleFadeOutDuration = 0.3;
  const linesDuration = 0.8;
  const typingSpeed = 0.03;
  const messageBackgroundColorDuration = 0.6;
  const formElementFadeDuration = 0.6;
  const formDelay = 0.6;
  const headerFadeDuration = 0.6;

  const linesGrid = document.querySelector('[data-first-visit-animate="lines"]');
  const header = document.querySelector('[data-first-visit-animate="header"]');

  gsap.set(createText, { opacity: 0 });
  gsap.set(investText, { opacity: 0 });
  gsap.set(longText, { opacity: 0 });
  if (linesGrid) gsap.set(linesGrid, { transform: 'translateY(-100%)' });
  if (header) gsap.set(header, { opacity: 0 });

  let firstMessage = content.querySelector('[data-first-visit-animate="first-message"]');
  if (firstMessage) {
    const rootStyle = window.getComputedStyle(document.documentElement);
    const fgColor = rootStyle.getPropertyValue('--fg-color').trim();
    firstMessage.style.transition = 'none';
    gsap.set(firstMessage, { opacity: 0, backgroundColor: 'transparent', color: fgColor || '#000000' });
  }

  const formElements = content.querySelectorAll('[data-first-visit-animate="form-element"]');
  if (formElements.length > 0) gsap.set(formElements, { opacity: 0 });
  const formLines = content.querySelectorAll('[data-first-visit-animate="form-line"]');
  if (formLines.length > 0) gsap.set(formLines, { transform: 'translateX(-100%)' });

  const tl = timeline;
  const firstCircleTime = timing.getCircleTime(1);
  tl.to(createText, { opacity: 1, duration: textFadeDuration, ease: 'power1.out' }, firstCircleTime);

  const fourthCircleTime = timing.getCircleTime(4);
  tl.to(createText, { opacity: 0, duration: textFadeDuration, ease: 'power1.in' }, fourthCircleTime);

  const fifthCircleTime = timing.getCircleTime(5);
  const fifthCircleEndTime = fifthCircleTime + circleDuration;
  tl.to(investText, { opacity: 1, duration: textFadeDuration, ease: 'power1.out' }, fifthCircleEndTime);

  const lastCircleTime = timing.getCircleTime(7);
  const lastCircleEndTime = lastCircleTime + circleDuration * 2;
  const circlesFadeOutEndTime = lastCircleEndTime + circleFadeOutDuration;
  const hiddenCirclesTime = circlesFadeOutEndTime;
  tl.to(investText, { opacity: 0, duration: textFadeDuration, ease: 'power1.in' }, hiddenCirclesTime);

  const longTextStartTime = hiddenCirclesTime + textFadeDuration + longTextDelay;
  tl.to(longText, { opacity: 1, duration: textFadeDuration, ease: 'power1.out' }, longTextStartTime);

  const longTextEndTime = longTextStartTime + textFadeDuration + longTextDisplayDuration;
  tl.to(longText, { opacity: 0, duration: textFadeDuration, ease: 'power1.in' }, longTextEndTime);

  const linesStartTime = longTextEndTime + textFadeDuration;
  if (linesGrid) {
    tl.to(linesGrid, { transform: 'translateY(0%)', duration: linesDuration, ease: 'none' }, linesStartTime);
  }

  const contentElementsStartTime = linesStartTime + linesDuration;
  let storedText = '';
  if (firstMessage) {
    const textElement = firstMessage.querySelector('p');
    if (textElement) storedText = (textElement.textContent || textElement.innerText || '').trim();
  }

  tl.call(() => {
    if (!firstMessage) {
      firstMessage = content.querySelector('[data-first-visit-animate="first-message"]');
      if (firstMessage) firstMessage.style.transition = 'none';
    }
    const nextFormElements = content.querySelectorAll('[data-first-visit-animate="form-element"]');
    const nextFormLines = content.querySelectorAll('[data-first-visit-animate="form-line"]');

    if (firstMessage) {
      const rootComputedStyle = window.getComputedStyle(document.documentElement);
      const darkGrayColor = rootComputedStyle.getPropertyValue('--dark-gray-color').trim();
      const bgColor = rootComputedStyle.getPropertyValue('--bg-color').trim();
      const initialFgColor = rootComputedStyle.getPropertyValue('--fg-color').trim() || '#000000';
      const textElement = firstMessage.querySelector('p');
      if (!textElement) return;
      const textFromDOM = (textElement.textContent || textElement.innerText || '').trim();
      const defaultMessage = `Welcome to Outside Observations®. We're glad you're here.

Use the menu on the left to explore, or tell me what you're looking for and I'll point you in the right direction.`;
      const textToType = storedText || textFromDOM || defaultMessage;
      if (!textToType) return;

      firstMessage.style.transition = 'none';
      gsap.set(firstMessage, { opacity: 1, color: initialFgColor, backgroundColor: 'transparent' });
      textElement.textContent = '';

      const typewriterObj = { progress: 0 };
      const typewriterDuration = textToType.length * typingSpeed;
      const currentTime = tl.time();
      tl.to(typewriterObj, {
        progress: 1,
        duration: typewriterDuration,
        ease: 'none',
        onUpdate: function onUpdate() {
          const progress = typewriterObj.progress;
          const currentLength = Math.floor(textToType.length * progress);
          textElement.textContent = textToType.substring(0, currentLength);
        },
        onComplete: function onComplete() {
          textElement.textContent = textToType;
        },
      }, currentTime)
        .to(firstMessage, {
          backgroundColor: darkGrayColor || '#333333',
          color: bgColor || '#ffffff',
          duration: messageBackgroundColorDuration,
          ease: 'none',
        }, '>')
        .call(() => {
          firstMessage.style.transition = '';
        });
    }

    if (nextFormLines.length > 0) {
      tl.to(nextFormLines, {
        transform: 'translateX(0%)',
        duration: linesDuration,
        ease: 'none',
      }, `>+${formDelay}`);
    }
    if (nextFormElements.length > 0) {
      tl.to(nextFormElements, {
        opacity: 1,
        duration: formElementFadeDuration,
        ease: 'power1.out',
      }, '>');
    }
    if (header) {
      tl.to(header, {
        opacity: 1,
        duration: headerFadeDuration,
        ease: 'power1.out',
      }, '>');
    }
  }, null, contentElementsStartTime);
}
