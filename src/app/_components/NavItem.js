'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import styles from '@app/_assets/nav.module.css';

const isExternalLink = (href) => {
  if (!href) {
    return false;
  }

  return href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//');
};

export default function NavItem({ href = '', label = '', children = null, section = '', className = '', ...rest }) {
  const pathname = usePathname() ?? '';
  const isExternal = isExternalLink(href);

  const normalizedHref = href.endsWith('/') ? href.slice(0, -1) : href;
  const normalizedPathname = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;

  const isActive =
    !isExternal &&
    (normalizedPathname === normalizedHref || normalizedPathname.startsWith(`${normalizedHref}/`));

  return (
    <li
      className={className}
      data-nav-section={section || undefined}
      data-active={isActive ? 'true' : 'false'}
    >
      <Link href={href} aria-current={isActive ? 'page' : undefined} {...rest} className={styles.navLink}>
        {label}
      </Link>
      {children}
    </li>
  );
}


