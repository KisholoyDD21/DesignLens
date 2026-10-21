import type { Metadata } from 'next';
import LegalLayout from '@/components/legal-layout';

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description: 'Terms for using DesignLens website analysis, user workspaces, generated design reports, and exports.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalLayout eyebrow="TRANSPARENCY / 02" title="Terms and conditions" updated="22 October 2026">
      <p className="legal-lead">
        By using DesignLens, you agree to these terms. If you do not agree, do not use the service.
      </p>

      <h2>1. The service</h2>
      <p>
        DesignLens analyzes public website pages or user-provided screenshots and generates design documentation and token exports. Reports are automated estimates based on the page and browser state observed at analysis time. They may be incomplete or unable to detect responsive states, hidden interactions, or every font and component variant.
      </p>

      <h2>2. User accounts and workspaces</h2>
      <p>
        You may use DesignLens as a guest or create an authenticated account to save design reports permanently. You are responsible for safeguarding your login credentials. You must provide accurate information and promptly notify the operator of any unauthorized account activity. You may delete your account and all associated workspace records at any time.
      </p>

      <h2>3. Your authority to submit content</h2>
      <p>
        You must have the right and authorization needed to submit a URL or screenshot for analysis. You are responsible for complying with the destination website’s terms, copyright, robots.txt instructions, and applicable law. Do not submit confidential, personal, or credential-bearing material.
      </p>

      <h2>4. Acceptable use</h2>
      <p>
        You must not use DesignLens to attack, overload, probe private infrastructure, bypass authentication, or violate applicable law. You must not attempt to access internal services, cloud metadata endpoints, or private networks. Rate limits and technical controls may restrict usage.
      </p>

      <h2>5. Generated reports and intellectual property</h2>
      <p>
        You may use exported reports for your lawful design, development, research, and documentation work. Reports describe design elements observed on public websites; receiving a report does not transfer ownership of third-party trademarks, images, copy, or source code.
      </p>

      <h2>6. Availability and retention</h2>
      <p>
        Guest reports are held temporarily in application memory and may be cleared during instance restarts. Registered user reports persist in database storage, but DesignLens does not guarantee permanent archival. Users should download important reports promptly as Markdown or ZIP packages.
      </p>

      <h2>7. Disclaimer</h2>
      <p>
        The service and generated outputs are provided &ldquo;as is&rdquo; without warranties of any kind. Do not treat a generated accessibility note as a certified audit or a generated design inference as authoritative fact.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the extent permitted by applicable law, the operator is not liable for indirect, incidental, or consequential damages arising from the use of the service.
      </p>
    </LegalLayout>
  );
}
