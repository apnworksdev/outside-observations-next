'use client';

import { useEffect, useState } from 'react';
import { useVisitorCount } from '@/app/_components/VisitorCountProvider';
import styles from '@app/_assets/visitor-notification.module.css';

/**
 * VisitorNotificationToast - Global notification component
 * Shows toast notifications when new visitors join
 * Only shows when Archive Navigation is closed
 */
export default function VisitorNotificationToast({ 
  isNavigationOpen = false, 
  isPanelOpen = false,
  isNavigationHovered = false
}) {
  const { notifications } = useVisitorCount();
  const [visibleNotification, setVisibleNotification] = useState(null);

  // Only show notification when navigation is closed
  const shouldShow = !isNavigationOpen && !isPanelOpen;

  useEffect(() => {
    // Show the most recent notification
    if (notifications.length > 0) {
      const latest = notifications[0];
      
      // Validate notification has required fields
      if (latest && typeof latest === 'object' && latest.message && typeof latest.message === 'string') {
        setVisibleNotification(latest);

        // Hide after 3 seconds
        const timer = setTimeout(() => {
          setVisibleNotification(null);
        }, 3000);

        return () => clearTimeout(timer);
      }
    }
  }, [notifications]);

  if (!visibleNotification || !shouldShow) {
    return null;
  }

  return (
    <div 
      className={styles.visitorNotificationToast} 
      role="alert" 
      aria-live="polite"
      data-navigation-closed="true"
      data-navigation-hovered={isNavigationHovered}
    >
      <span className={styles.visitorNotificationToastMessage}>
        {visibleNotification.message}
      </span>
    </div>
  );
}

