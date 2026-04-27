'use client';

import { useEffect } from 'react';

export function useChatAutoScroll(chatBoxContentRef, messages) {
  useEffect(() => {
    const chatBoxContent = chatBoxContentRef.current;
    if (!chatBoxContent) return;

    chatBoxContent.scrollTop = chatBoxContent.scrollHeight;

    let lastScrollHeight = chatBoxContent.scrollHeight;
    let rafId = null;
    let needsCheck = false;

    const checkAndScroll = () => {
      if (!chatBoxContent || !needsCheck) {
        rafId = null;
        return;
      }

      needsCheck = false;
      const currentScrollHeight = chatBoxContent.scrollHeight;
      const currentScrollTop = chatBoxContent.scrollTop;
      const clientHeight = chatBoxContent.clientHeight;

      if (currentScrollHeight !== lastScrollHeight) {
        const isNearBottom = currentScrollTop + clientHeight >= currentScrollHeight - 100;
        if (isNearBottom) {
          chatBoxContent.scrollTop = currentScrollHeight;
        }
        lastScrollHeight = currentScrollHeight;
      }
      rafId = null;
    };

    if (typeof MutationObserver === 'undefined') {
      return;
    }

    const observer = new MutationObserver(() => {
      if (!needsCheck && !rafId) {
        needsCheck = true;
        rafId = requestAnimationFrame(checkAndScroll);
      }
    });

    observer.observe(chatBoxContent, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [chatBoxContentRef, messages]);
}
