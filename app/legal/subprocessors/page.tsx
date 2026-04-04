import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Subprocessors | Regula",
  description: "List of subprocessors used by Regula.",
};

export default function SubprocessorsPage() {
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
          <CardTitle className="text-3xl">Subprocessors</CardTitle>
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
            <p>
              Regula uses trusted third-party vendors (“subprocessors”) to help
              deliver the Service. This list is informational and may change as
              we improve the product.
            </p>
            <p className="mt-4">
              For questions or to request advance notice of changes, contact
              &nbsp;
              <a
                href="mailto:privacy@regula.mushoodhanif.com"
                className="text-primary hover:underline"
              >
                privacy@regula.mushoodhanif.com
              </a>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              Current subprocessors
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Neon</strong> – managed Postgres database hosting
              </li>
              <li>
                <strong>Vercel</strong> – application hosting and delivery
              </li>
              <li>
                <strong>Stripe</strong> – payments and billing
              </li>
              <li>
                <strong>Resend</strong> – transactional email delivery
              </li>
              <li>
                <strong>Google Gemini</strong> – AI analysis/summarization
                (where enabled)
              </li>
            </ul>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
