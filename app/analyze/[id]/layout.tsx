import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analysis workspace',
  description: 'Review and export a generated DesignLens design-system report.',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default function AnalysisLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
