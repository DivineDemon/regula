import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { publicLegalMetadata } from "@/lib/seo-metadata";

export const metadata = publicLegalMetadata(
  "/legal/cookies",
  "Cookie Policy | Regula",
  "Cookie Policy for Regula - Real-Time Regulatory Intelligence Platform",
);

export default function CookiePolicyPage() {
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
          <CardTitle className="text-3xl">Cookie Policy</CardTitle>
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
            <h2 className="text-2xl font-semibold mb-4">
              1. What Are Cookies?
            </h2>
            <p>
              Cookies are small text files that are placed on your device when
              you visit a website. They are widely used to make websites work
              more efficiently and provide information to website owners.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              2. How We Use Cookies
            </h2>
            <p>Regula uses cookies and similar tracking technologies to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Authenticate and maintain your session</li>
              <li>Remember your preferences and settings</li>
              <li>Analyze how you use the Service</li>
              <li>Improve security and prevent fraud</li>
              <li>Provide personalized content</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              3. Types of Cookies We Use
            </h2>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              3.1 Essential Cookies
            </h3>
            <p>
              These cookies are necessary for the Service to function properly.
              They enable core functionality such as authentication and
              security.
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>next-auth.session-token:</strong> Maintains your login
                session
              </li>
              <li>
                <strong>next-auth.csrf-token:</strong> Protects against CSRF
                attacks
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              3.2 Functional Cookies
            </h3>
            <p>
              These cookies enable enhanced functionality and personalization.
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>theme:</strong> Remembers your theme preference
                (light/dark)
              </li>
              <li>
                <strong>organizationId:</strong> Remembers your selected
                organization
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              3.3 Analytics Cookies
            </h3>
            <p>
              These cookies help us understand how visitors interact with the
              Service. We may use services like Vercel Analytics.
            </p>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              3.4 Third-Party Cookies
            </h3>
            <p>Some third-party services we use may set their own cookies:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>Stripe:</strong> Payment processing
              </li>
              <li>
                <strong>Vercel Analytics:</strong> Website analytics
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Cookie Duration</h2>
            <p>Cookies may be:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Session cookies:</strong> Temporary, deleted when you
                close your browser
              </li>
              <li>
                <strong>Persistent cookies:</strong> Remain on your device for a
                set period or until deleted
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Managing Cookies</h2>
            <p>You can control and manage cookies in several ways:</p>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              5.1 Browser Settings
            </h3>
            <p>Most browsers allow you to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>View and delete cookies</li>
              <li>Block cookies from specific sites</li>
              <li>Block all cookies</li>
              <li>Delete all cookies when closing the browser</li>
            </ul>
            <p className="mt-2">
              Note: Blocking essential cookies may impact the functionality of
              the Service.
            </p>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              5.2 Service Settings
            </h3>
            <p>
              You can manage certain cookie preferences through your account
              settings in the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              6. Do Not Track Signals
            </h2>
            <p>
              Some browsers include a "Do Not Track" (DNT) feature. Currently,
              there is no standard for how DNT signals should be interpreted. We
              do not respond to DNT signals at this time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              7. Updates to This Policy
            </h2>
            <p>
              We may update this Cookie Policy from time to time. We will notify
              you of material changes via email or through the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
            <p>
              If you have questions about our use of cookies, contact us at:
            </p>
            <p className="mt-2">
              Email:&nbsp;
              <a
                href="mailto:privacy@regula.mushoodhanif.com"
                className="text-primary hover:underline"
              >
                privacy@regula.mushoodhanif.com
              </a>
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
