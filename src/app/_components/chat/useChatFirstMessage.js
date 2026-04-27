'use client';

import { useEffect } from 'react';

import { client } from '@/sanity/lib/client';
import { SITE_SETTINGS_QUERY } from '@/sanity/lib/queries';

export function useChatFirstMessage(updateFirstMessage, defaultMessage) {
  useEffect(() => {
    const fetchChatFirstMessage = async () => {
      try {
        const siteSettings = await client.fetch(SITE_SETTINGS_QUERY);
        const chatFirstMessage = siteSettings?.chatFirstMessage;
        const firstMessageText =
          chatFirstMessage && chatFirstMessage.trim()
            ? chatFirstMessage.trim()
            : defaultMessage;
        updateFirstMessage(firstMessageText);
      } catch (error) {
        console.error('Failed to fetch chat first message from site settings:', error);
        updateFirstMessage(defaultMessage);
      }
    };

    const timeoutId = setTimeout(fetchChatFirstMessage, 100);
    return () => clearTimeout(timeoutId);
  }, [defaultMessage, updateFirstMessage]);
}
