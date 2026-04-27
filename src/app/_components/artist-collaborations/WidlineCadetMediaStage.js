'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRadioIframe } from '@/app/_components/shared/RadioIframeProvider';
import SanityImage from '@/sanity/components/SanityImage';
import SanityVideo from '@/sanity/components/SanityVideo';
import styles from '@app/_assets/archive/artist-collaboration-page.module.css';

const FOREGROUND_PARALLAX_SPEED = 0.08;

function renderRichText(blocks) {
  if (!Array.isArray(blocks)) {
    return null;
  }

  return blocks
    .map((block, index) => {
      if (block?._type !== 'block' || !Array.isArray(block.children)) {
        return null;
      }

      const text = block.children.map((child) => child?.text || '').join('').trim();

      if (!text) {
        return null;
      }

      if (block.style === 'h2') {
        return <h2 key={`${block._key || 'block'}-${index}`}>{text}</h2>;
      }

      return <p key={`${block._key || 'block'}-${index}`}>{text}</p>;
    })
    .filter(Boolean);
}

function MediaItem({ item, index, mediaIndex, cycleIndex, collaborationTitle }) {
  const isVideo = item?.mediaType === 'video' && item?.video?.asset?.url;
  const mediaCycle = ((cycleIndex % 7) + 1).toString();

  if (isVideo) {
    return (
      <div
        className={styles.imageItemWrapper}
        data-media-item
        data-media-index={mediaIndex}
        data-media-cycle={mediaCycle}
      >
        <div
          id={`widline-media-${mediaIndex}`}
          className={styles.imageWrapper}
        >
          <SanityVideo
            video={item.video}
            alt={item?.alt || `${collaborationTitle || 'Artist collaboration'} video ${index + 1}`}
            className={styles.video}
            controls={false}
            muted
            playsInline
            loop
            preload="metadata"
          />
        </div>
      </div>
    );
  }

  if (!item?.image) {
    return null;
  }

  const width = item?.image?.dimensions?.width || 1200;
  const height = item?.image?.dimensions?.height || 1200;

  return (
    <div
      className={styles.imageItemWrapper}
      data-media-item
      data-media-index={mediaIndex}
      data-media-cycle={mediaCycle}
    >
      <div
        id={`widline-media-${mediaIndex}`}
        className={styles.imageWrapper}
      >
        <SanityImage
          image={item.image}
          alt={
            item?.alt ||
            item?.imageFileName ||
            `${collaborationTitle || 'Artist collaboration'} image ${index + 1}`
          }
          width={width}
          height={height}
          className={styles.image}
          placeholder={item?.image?.lqip ? 'blur' : undefined}
          blurDataURL={item?.image?.lqip || undefined}
        />
      </div>
    </div>
  );
}

export default function WidlineCadetMediaStage({
  backgroundMedia = [],
  foregroundMedia = [],
  richTextBlocks = [],
  collaborationTitle,
}) {
  const searchParams = useSearchParams();
  const { isOpen: isRadioOpen, openRadio } = useRadioIframe();
  const stageRef = useRef(null);
  const backgroundRef = useRef(null);
  const foregroundRef = useRef(null);
  const didAttemptAutoOpenRadioRef = useRef(false);
  const [computedMinHeight, setComputedMinHeight] = useState(null);

  useEffect(() => {
    if (didAttemptAutoOpenRadioRef.current) {
      return;
    }

    didAttemptAutoOpenRadioRef.current = true;
    if (!isRadioOpen) {
      openRadio();
    }
  }, [isRadioOpen, openRadio]);

  useEffect(() => {
    const backgroundElement = backgroundRef.current;
    const foregroundElement = foregroundRef.current;

    if (!backgroundElement || !foregroundElement) {
      return undefined;
    }

    const computeStageMinHeight = () => {
      const backgroundHeight = Math.max(
        backgroundElement.scrollHeight || 0,
        backgroundElement.offsetHeight || 0
      );
      const foregroundHeight = Math.max(
        foregroundElement.scrollHeight || 0,
        foregroundElement.offsetHeight || 0
      );
      const nextHeight = Math.max(backgroundHeight, foregroundHeight);
      setComputedMinHeight(nextHeight > 0 ? nextHeight : null);
    };

    computeStageMinHeight();

    const resizeObserver = new ResizeObserver(() => {
      computeStageMinHeight();
    });

    resizeObserver.observe(backgroundElement);
    resizeObserver.observe(foregroundElement);

    window.addEventListener('resize', computeStageMinHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', computeStageMinHeight);
    };
  }, [backgroundMedia, foregroundMedia]);

  useEffect(() => {
    const stageElement = stageRef.current;
    const foregroundElement = foregroundRef.current;
    if (!stageElement || !foregroundElement) {
      return undefined;
    }

    const scrollHost = stageElement.closest(`.${styles.container}`) || window;
    let rafId = 0;
    const updateParallax = () => {
      const scrollTop = scrollHost === window ? window.scrollY : scrollHost.scrollTop;
      const offset = scrollTop * FOREGROUND_PARALLAX_SPEED;
      foregroundElement.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
      rafId = 0;
    };

    const onScroll = () => {
      if (rafId !== 0) {
        return;
      }
      rafId = window.requestAnimationFrame(updateParallax);
    };

    updateParallax();
    scrollHost.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }
      scrollHost.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      foregroundElement.style.transform = '';
    };
  }, [backgroundMedia.length, foregroundMedia.length]);

  useEffect(() => {
    const mediaParam = searchParams.get('media');
    if (mediaParam === null) {
      return;
    }

    const targetIndex = Number.parseInt(mediaParam, 10);
    if (!Number.isInteger(targetIndex) || targetIndex < 0) {
      return;
    }

    let frameOne = 0;
    let frameTwo = 0;
    frameOne = window.requestAnimationFrame(() => {
      frameTwo = window.requestAnimationFrame(() => {
        const target = document.getElementById(`widline-media-${targetIndex}`);
        if (!target) {
          return;
        }
        target.scrollIntoView({ block: 'center', behavior: 'auto' });
      });
    });

    return () => {
      window.cancelAnimationFrame(frameOne);
      window.cancelAnimationFrame(frameTwo);
    };
  }, [searchParams]);

  const richText = renderRichText(richTextBlocks);
  const shouldRenderText = richText?.length > 0;
  return (
    <section
      ref={stageRef}
      className={styles.mediaStage}
      style={computedMinHeight ? { minHeight: `${computedMinHeight}px` } : undefined}
    >
      <div ref={backgroundRef} className={styles.backgroundMediaLayer}>
        {backgroundMedia.map((item, index) => (
          <Fragment key={item?._key || `background-${index}`}>
            <MediaItem
              item={item}
              index={index}
              mediaIndex={index}
              cycleIndex={index}
              collaborationTitle={collaborationTitle}
            />
            {shouldRenderText && index === 1 ? (
              <div className={styles.richTextWrapper}>
                <div className={styles.richText} data-media-index="text">
                  {richText}
                </div>
              </div>
            ) : null}
          </Fragment>
        ))}
        {shouldRenderText && backgroundMedia.length < 2 ? (
          <div className={styles.richText} data-media-index="text">
            {richText}
          </div>
        ) : null}
      </div>

      <div ref={foregroundRef} className={styles.foregroundMediaLayer}>
        {foregroundMedia.map((item, index) => (
          <MediaItem
            key={item?._key || `foreground-${index}`}
            item={item}
            index={index}
            mediaIndex={backgroundMedia.length + index}
            cycleIndex={index}
            collaborationTitle={collaborationTitle}
          />
        ))}
      </div>
    </section>
  );
}
