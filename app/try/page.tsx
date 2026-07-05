import type { Metadata } from 'next';
import { SiteHeader } from '@/components/shared/site-header';
import { SiteFooter } from '@/components/shared/site-footer';
import { TryBody } from './try-body';

export const metadata: Metadata = {
  title: 'Try ProductShot — Free demo, no signup',
  description:
    'Turn one product photo into a Studio White shot in 60 seconds. Free demo, no signup required.',
};

export default function TryPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <TryBody />
      </main>
      <SiteFooter />
    </div>
  );
}
