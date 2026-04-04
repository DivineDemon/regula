import { Comparison } from "@/components/landing/comparison";
import { Contact } from "@/components/landing/contact";
import { CTA } from "@/components/landing/cta";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/landing/navbar";
import { Pricing } from "@/components/landing/pricing";

export default function LandingPage() {
  return (
    <div className="w-full min-h-screen font-sans">
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
