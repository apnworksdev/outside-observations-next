'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const isExternalLink = (href) => {
  if (!href) {
    return false;
  }
  return href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//');
};

export default function NavLink({ href = '', children, ...rest }) {
  const pathname = usePathname() ?? '';

  const isExternal = isExternalLink(href);
  const isActive =
    !isExternal && (pathname === href || pathname.startsWith(`${href.endsWith('/') ? href : `${href}/`}`));

  if (isExternal) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      data-active={isActive ? 'true' : 'false'}
      aria-current={isActive ? 'page' : undefined}
      {...rest}
    >
      {children}
    </Link>
  );
}


