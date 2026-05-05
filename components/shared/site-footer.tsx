import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border/40 bg-muted/30 border-t">
      <div className="container-prose py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-lg">ProductShot</span>
            </Link>
            <p className="text-muted-foreground mt-4 max-w-md text-sm">
              Professional product photography from a single phone shot. Built for online sellers
              who need to ship listings, not run photo shoots.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Product</h3>
            <ul className="text-muted-foreground mt-4 space-y-3 text-sm">
              <li>
                <Link href="/#how-it-works" className="hover:text-foreground transition-colors">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="/#examples" className="hover:text-foreground transition-colors">
                  Examples
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-foreground transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Legal</h3>
            <ul className="text-muted-foreground mt-4 space-y-3 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:text-foreground transition-colors">
                  Refund policy
                </Link>
              </li>
              <li>
                <Link
                  href="mailto:hello@productshot.ai"
                  className="hover:text-foreground transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-border/40 mt-12 flex flex-col items-start justify-between gap-4 border-t pt-8 sm:flex-row sm:items-center">
          <p className="text-muted-foreground text-xs">
            © {year} ProductShot AI. All rights reserved.
          </p>
          <p className="text-muted-foreground text-xs">
            Made for sellers who&apos;d rather ship than stage.
          </p>
        </div>
      </div>
    </footer>
  );
}
