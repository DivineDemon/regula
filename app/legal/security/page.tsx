import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { publicLegalMetadata } from "@/lib/seo-metadata";

export const metadata = publicLegalMetadata(
  "/legal/security",
  "Security Policy | Regula",
  "Security policy and vulnerability reporting for Regula.",
);

export default function SecurityPolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Home
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Security Policy</CardTitle>
          <p className="text-sm text-muted-foreground">
            Last updated:&nbsp;
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Scope</h2>
            <p>
              This Security Policy describes how to report security
              vulnerabilities that could impact Regula and how we handle
              reports.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              2. Reporting a Vulnerability
            </h2>
            <p>
              Email&nbsp;
              <a
                href="mailto:security@regula.mushoodhanif.com"
                className="text-primary hover:underline"
              >
                security@regula.mushoodhanif.com
              </a>
              &nbsp;with:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Affected URL(s) or component(s)</li>
              <li>Steps to reproduce or proof-of-concept</li>
              <li>Expected vs observed behavior</li>
              <li>Any relevant logs/screenshots</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Safe Harbor</h2>
            <p>
              We welcome good-faith security research. Please avoid privacy
              violations, data destruction, or disruption of service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Response Process</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We acknowledge receipt within 3 business days.</li>
              <li>We triage severity and validate impact.</li>
              <li>
                We coordinate remediation and will notify you when it’s
                resolved.
              </li>
            </ul>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
