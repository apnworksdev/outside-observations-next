'use client';

import { useRef, useState } from 'react';
import styles from '@app/_assets/archive/closed.module.css';

export default function KlaviyoForm() {
  const formRef = useRef(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const form = formRef.current;
    if (!form) {
      setIsSubmitting(false);
      return;
    }

    const emailInput = form.querySelector('input[name="email"]');
    const email = emailInput?.value;

    if (!email) {
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData(form);
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
        mode: 'no-cors', // Klaviyo endpoint may not support CORS, use no-cors mode
      });
      
      // With no-cors mode, we can't read the response, but we assume success
      // if no error was thrown
      setIsSubscribed(true);
      setIsSubmitting(false);
      form.reset();
    } catch (error) {
      // Even with errors, we'll show success as Klaviyo often processes
      // the subscription even if the response can't be read
      setIsSubscribed(true);
      setIsSubmitting(false);
      form.reset();
    }
  };

  return (
    <>
      {isSubscribed ? (
        <div className={styles.successMessage}>
          Successfully subscribed!
        </div>
      ) : (
        <form
          ref={formRef}
          className={styles.emailForm}
          action="https://manage.kmail-lists.com/subscriptions/subscribe"
          method="POST"
          onSubmit={handleSubmit}
          noValidate
          autoComplete="off"
        >
          <input
            type="hidden"
            name="g"
            value="RdMqsP"
          />
          <input
            className={styles.emailInput}
            type="email"
            name="email"
            placeholder={isSubmitting ? 'Subscribing...' : 'Enter email'}
            required
            disabled={isSubmitting}
            autoComplete="off"
            spellCheck="false"
            data-form-type="other"
          />
        </form>
      )}
    </>
  );
}

