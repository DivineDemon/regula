import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { publicLegalMetadata } from "@/lib/seo-metadata";

export const metadata = publicLegalMetadata(
  "/legal/support",
  "Support | Regula",
  "Support and service levels for Regula customers.",
);

export default function SupportPage() {
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
          <CardTitle className="text-3xl">Support</CardTitle>
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
            <h2 className="text-2xl font-semibold mb-4">Contact</h2>
            <p>
              For product support, email&nbsp;
              <a
                href="mailto:support@regula.mushoodhanif.com"
                className="text-primary hover:underline"
              >
                support@regula.mushoodhanif.com
              </a>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Service levels</h2>
            <p>
              Response targets vary by subscription tier and may be customized
              for Enterprise agreements.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Free / Starter</strong>: best-effort support
              </li>
              <li>
                <strong>Growth</strong>: prioritized support during business
                hours
              </li>
              <li>
                <strong>Enterprise</strong>: customized SLA and escalation path
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              Incident notifications
            </h2>
            <p>
              For security incidents impacting customer data or availability, we
              will provide timely updates via email and in-app notifications
              where applicable.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
