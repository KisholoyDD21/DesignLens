'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, User } from 'lucide-react';

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="settings-nav" aria-label="Settings navigation">
      <Link
        href="/settings"
        className={`settings-tab-link ${pathname === '/settings' ? 'active' : ''}`}
      >
        <User size={15} />
        <span>General Profile</span>
      </Link>
      <Link
        href="/settings/security"
        className={`settings-tab-link ${pathname === '/settings/security' ? 'active' : ''}`}
      >
        <Shield size={15} />
        <span>Security &amp; Account</span>
      </Link>
    </nav>
  );
}
