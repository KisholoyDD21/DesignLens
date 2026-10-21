'use client';

export default function CookieSettingsTrigger() {
  return <button className="footer-cookie-settings" type="button" onClick={() => window.dispatchEvent(new Event('designlens:cookie-settings'))}>Cookie settings</button>;
}
