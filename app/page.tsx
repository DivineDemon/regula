import type { Metadata } from "next";
import { Comparison } from "@/components/landing/comparison";
import { Contact } from "@/components/landing/contact";
import { CTA } from "@/components/landing/cta";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HomeJsonLd } from "@/components/landing/home-json-ld";
import { Navbar } from "@/components/landing/navbar";
import { Pricing } from "@/components/landing/pricing";

const homeDescription =
  "Automate regulatory compliance monitoring for emerging-market FinTechs. Real-time regulatory intelligence, AI-powered change detection, and instant alerts.";

export const metadata: Metadata = {
  title: "Regula - AI-Powered Regulatory Compliance Monitoring Platform",
  description: homeDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Regula - AI-Powered Regulatory Compliance Monitoring",
    description: homeDescription,
    url: "/",
  },
  twitter: {
    title: "Regula - AI-Powered Regulatory Compliance Monitoring",
    description: homeDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function LandingPage() {
  return (
    <div className="w-full min-h-screen font-sans">
      <HomeJsonLd />
      <Navbar />
      <Hero />
      <hr className="w-full border-t border-border" />
      <Features />
      <hr className="w-full border-t border-border" />
      <Comparison />
      <hr className="w-full border-t border-border" />
      <Pricing />
      <hr className="w-full border-t border-border" />
      <CTA />
      <hr className="w-full border-t border-border" />
      <Contact />
      <hr className="w-full border-t border-border" />
      <Footer />
    </div>
  );
}
