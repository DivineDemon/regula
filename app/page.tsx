import { Comparison } from "@/components/landing/comparison";
import { Contact } from "@/components/landing/contact";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/landing/navbar";
import { Stats } from "@/components/landing/stats";
import { Testimonials } from "@/components/landing/testimonials";
import { ScrollProgress } from "@/components/ui/scroll-progress";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col font-sans">
      <ScrollProgress />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Stats />
        <Features />
        <Comparison />
        <Testimonials />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
