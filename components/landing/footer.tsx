import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export function Footer() {
  return (
    <footer className="mt-auto w-full flex flex-col max-w-7xl mx-auto border-x">
      <div className="w-full px-6">
        <div className="w-full h-full border-x grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-0 items-center justify-center py-10 px-5">
          <div className="w-fit h-full flex flex-col items-start justify-start">
            <div className="flex items-center gap-2 mb-4">
              <Logo size={24} />
              <span className="font-bold text-lg font-heading">Regula</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Crawler-backed monitoring, triage workflows, and exports—built for
              teams that need a clear system of record, not legal advice in a
              box.
            </p>
          </div>
          <div className="flex items-start justify-start md:justify-end gap-10">
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="#features"
                    className="hover:text-primary transition-colors"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#comparison"
                    className="hover:text-primary transition-colors"
                  >
                    Comparison
                  </Link>
                </li>
                <li>
                  <Link
                    href="#pricing"
                    className="hover:text-primary transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="#contact"
                    className="hover:text-primary transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="/legal/privacy"
                    className="hover:text-primary transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/legal/terms"
                    className="hover:text-primary transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/legal/security"
                    className="hover:text-primary transition-colors"
                  >
                    Security Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/legal/cookies"
                    className="hover:text-primary transition-colors"
                  >
                    Cookies
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <p className="w-full text-center text-xs p-5 border-t">
        &copy; {new Date().getFullYear()} Regula. All rights reserved.
      </p>
    </footer>
  );
}
