import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  FileText,
  Lock,
  Search,
  Shield,
  TrendingUp,
  Users,
  Webhook,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <span className="text-xl font-bold">Regula</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Stay Ahead of Regulatory Changes
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Automated regulatory monitoring and intelligence platform for
              emerging-market FinTechs. Get instant alerts when regulations
              change, powered by AI-powered analysis.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Button size="lg" className="text-lg px-8" asChild>
                <Link href="/register">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8"
                asChild
              >
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No credit card required • Free trial available
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <div className="mb-12 text-center">
                <h2 className="text-3xl font-bold sm:text-4xl">
                  Everything You Need for Regulatory Compliance
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Comprehensive tools designed specifically for FinTech teams in
                  emerging markets
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Zap className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Real-Time Monitoring</CardTitle>
                    <CardDescription>
                      Continuous monitoring of regulatory websites with instant
                      change detection
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Automated crawling and version tracking
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Intelligent diff engine for change detection
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Multi-jurisdiction support
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Search className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>AI-Powered Analysis</CardTitle>
                    <CardDescription>
                      Intelligent summaries and impact scoring powered by Google
                      Gemini
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Automated summarization of changes
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Impact scoring and prioritization
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Category classification
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Bell className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Multi-Channel Alerts</CardTitle>
                    <CardDescription>
                      Receive notifications where you work, when you need them
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Email notifications & digests
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Slack & Microsoft Teams integration
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Custom webhook support
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <BarChart3 className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Analytics & Dashboard</CardTitle>
                    <CardDescription>
                      Comprehensive metrics and visualizations to track
                      compliance health
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Real-time alert metrics
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Trends and pattern analysis
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Usage tracking and quotas
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Team Collaboration</CardTitle>
                    <CardDescription>
                      Work together with your compliance team effectively
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Alert assignments and comments
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Role-based access control
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Version comparison tools
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Compliance Ready</CardTitle>
                    <CardDescription>
                      Enterprise-grade security and audit capabilities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Complete audit trails
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        PDF & CSV export
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        GDPR compliant data management
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="border-t py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <div className="mb-12 text-center">
                <h2 className="text-3xl font-bold sm:text-4xl">
                  Built for Emerging Market FinTechs
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Stop manually checking regulator websites. Let Regula do the
                  work.
                </p>
              </div>
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        Licensing & Registration
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Track changes to licensing requirements, application
                        processes, and regulatory approvals
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Fee & Tax Updates</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Never miss changes to fee structures, tax rates, or
                        payment requirements
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Lock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">AML & KYC Requirements</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Stay current with anti-money laundering and
                        know-your-customer regulation updates
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Webhook className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Operational Compliance</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Monitor operational guidelines, reporting requirements,
                        and compliance deadlines
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t bg-primary text-primary-foreground py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold sm:text-4xl">
                Ready to Simplify Your Regulatory Compliance?
              </h2>
              <p className="mt-4 text-lg opacity-90">
                Join FinTech teams across emerging markets who trust Regula to
                keep them compliant
              </p>
              <div className="mt-8 flex items-center justify-center gap-4">
                <Button
                  size="lg"
                  variant="secondary"
                  className="text-lg px-8"
                  asChild
                >
                  <Link href="/register">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Logo size={24} />
              <span className="font-semibold">Regula</span>
            </div>
            <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                <Link
                  href="/legal/terms"
                  className="hover:text-foreground transition-colors"
                >
                  Terms
                </Link>
                <Link
                  href="/legal/privacy"
                  className="hover:text-foreground transition-colors"
                >
                  Privacy
                </Link>
                <Link
                  href="/legal/cookies"
                  className="hover:text-foreground transition-colors"
                >
                  Cookies
                </Link>
                <Link
                  href="/legal/aup"
                  className="hover:text-foreground transition-colors"
                >
                  AUP
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Regula. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
