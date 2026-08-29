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

  const ring = document.querySelector('[data-first-visit-animate="ring"]');
  const dots = ring ? Array.from(ring.querySelectorAll('[data-number]')) : [];
  const introTypingSpeed = 0.045;
  const eraseDuration = 0.35;

  const typeInto = (element, at, { erase = true } = {}) => {
    const p = element.querySelector('p');
    const text = p ? (p.textContent || '').trim() : '';
    if (!p || !text) return at;

    const proxy = { chars: 0 };
    const render = () => {
      p.textContent = text.substring(0, Math.round(proxy.chars));
    };
    const typeDuration = text.length * introTypingSpeed;

    tl.set(p, { textContent: '' }, at);
    tl.set(element, { opacity: 1 }, at);
    tl.to(proxy, { chars: text.length, duration: typeDuration, ease: 'none', onUpdate: render }, at);

    let end = at + typeDuration;
    if (erase) {
      tl.to(proxy, { chars: 0, duration: eraseDuration, ease: 'power1.in', onUpdate: render }, end + 1.1);
      end += 1.1 + eraseDuration;
    }
    return end;
  };

  if (dots.length > 0) {
    tl.fromTo(
      ring,
      { rotation: -14, transformOrigin: '50% 50%' },
      { rotation: 0, duration: timing.getCircleTime(7) + circleDuration - timing.startTime, ease: 'power1.out' },
      timing.startTime
    );

    dots.forEach((dot, index) => {
      tl.fromTo(
        dot,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: circleDuration, ease: 'back.out(2.4)' },
        timing.getCircleTime(index)
      );
    });
  }

  const createEnd = typeInto(createText, timing.getCircleTime(0) + 0.2);
  typeInto(investText, Math.max(createEnd + 0.1, timing.getCircleTime(4) + 0.2), { erase: false });

  const lastCircleTime = timing.getCircleTime(7);
  const lastCircleEndTime = lastCircleTime + circleDuration * 2;

  if (dots.length > 0) {
    tl.to(dots, { scale: 1.4, duration: 0.22, ease: 'power2.out', stagger: 0.04, yoyo: true, repeat: 1 }, lastCircleEndTime);
  }

  const implodeTime = lastCircleEndTime + 0.22 * 2 + 0.04 * dots.length + 0.15;
  const implodeDuration = 0.4;
  if (dots.length > 0) {
    tl.to(
      dots,
      { scale: 0, duration: implodeDuration, ease: 'power3.in', stagger: 0.06 },
      implodeTime
    );
  }
  tl.to(investText, { opacity: 0, duration: circleFadeOutDuration, ease: 'power1.in' }, implodeTime + implodeDuration - 0.1);

  const hiddenCirclesTime = implodeTime + implodeDuration + 0.06 * dots.length;

  tl.call(() => {
    if (linesGrid) {
      gsap.set(linesGrid, { zIndex: 10001 });
      gsap.to(linesGrid, { transform: 'translateY(0%)', duration: linesDuration, ease: 'power2.inOut' });
    }
    if (header) {
      gsap.to(header, {
        opacity: 1,
        duration: headerFadeDuration,
        delay: linesDuration + 0.1,
        ease: 'power1.out',
        clearProps: 'opacity',
      });
    }
  }, null, hiddenCirclesTime + 0.15);

  tl.call(() => {
    if (linesGrid) {
      gsap.set(linesGrid, { clearProps: 'zIndex' });
    }
  }, null, hiddenCirclesTime + 0.15 + linesDuration);

  tl.set({}, {}, hiddenCirclesTime + 0.15 + linesDuration + 0.05);
}
