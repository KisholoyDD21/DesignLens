import type { Metadata } from 'next';
import LegalLayout from '@/components/legal-layout';

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description: 'Terms for using DesignLens website analysis, screenshot uploads, generated design reports, and exports.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return <LegalLayout eyebrow="TRANSPARENCY / 02" title="Terms and conditions" updated="20 October 2026">
    <p className="legal-lead">By using DesignLens, you agree to these terms. If you do not agree, do not use the service.</p>
    <h2>1. The service</h2><p>DesignLens analyzes public website pages or user-provided screenshots and generates design documentation and token exports. Reports are automated estimates based on the page and browser state observed at analysis time. They may be incomplete, inaccurate, or unable to detect responsive states, hidden interactions, inaccessible stylesheets, or every font and component variant.</p>
    <h2>2. Your authority to submit content</h2><p>You must have the right and authorization needed to submit a URL or screenshot for analysis. You are responsible for complying with the destination website’s terms, copyright, robots.txt instructions, applicable law, and any contractual or organizational rules. Do not submit confidential, personal, credential-bearing, or otherwise sensitive material.</p>
    <h2>3. Acceptable use</h2><p>You must not use DesignLens to attack, overload, probe private infrastructure, bypass authentication or technical restrictions, infringe others’ rights, or violate applicable law. You must not attempt to access internal services, cloud metadata endpoints, or private networks. Rate limits and technical controls may restrict use.</p>
    <h2>4. Generated reports and intellectual property</h2><p>You may use exported reports for your lawful design, development, research, and documentation work. Reports may describe design elements owned by third parties; receiving a report does not transfer ownership of third-party trademarks, images, copy, source code, or other protected material, and does not grant a license to reproduce them. You are responsible for how you use generated material.</p>
    <h2>5. Third-party providers</h2><p>The service may rely on hosting, browser automation, image processing, and—if enabled—an optional AI provider or analytics provider. Their availability and processing are subject to their own terms. The operator should document the currently enabled providers before launch.</p>
    <h2>6. Availability and retention</h2><p>DesignLens is provided without a guarantee of uninterrupted availability, any particular analysis time, or permanent report storage. Results are held temporarily in application memory and may be lost earlier through restarts or serverless instance boundaries. Download important reports promptly.</p>
    <h2>7. Disclaimer</h2><p>To the fullest extent permitted by applicable law, the service and generated outputs are provided “as is” and “as available,” without warranties that the output is accurate, complete, non-infringing, accessible, fit for a particular purpose, or secure for every deployment. Do not treat a generated accessibility note as a certified audit or a generated design inference as authoritative fact.</p>
    <h2>8. Limitation of liability</h2><p>To the extent permitted by applicable law, the operator is not liable for indirect, incidental, special, consequential, exemplary, or loss-of-data damages arising from use of the service. Nothing in these terms excludes liability that cannot lawfully be excluded.</p>
    <h2>9. Suspension and changes</h2><p>The operator may limit, suspend, or discontinue access to protect the service, comply with law, or respond to misuse. These terms may be updated as the product changes. Continued use after updated terms are published means you accept them to the extent allowed by law.</p>
    <h2>10. Governing law and contact</h2><p>The operator must replace this template’s default legal language with the applicable governing law, venue, operator identity, and contact details before public launch. These terms are informational software-project copy and are not legal advice.</p>
  </LegalLayout>;
}
