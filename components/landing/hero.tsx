import { Layers } from "lucide-react";
import Link from "next/link";
import { HeroVideoDialog } from "../ui/hero-video-dialog";

export function Hero() {
  return (
    <section className="w-full relative flex flex-col max-w-7xl mx-auto border-x">
      <div className="absolute inset-0 -z-10 h-[600px] md:h-[800px] w-full [background:radial-gradient(125%_125%_at_50%_10%,var(--background)_40%,var(--primary)_100%)] rounded-b-xl" />
      <div className="w-full px-6 min-h-screen">
        <div className="w-full h-full border-x flex flex-col items-center justify-center gap-8 xl:gap-12">
          <div className="pt-32 max-w-3xl mx-auto h-full w-full flex flex-col gap-10 items-center justify-center">
            <p className="bg-accent/50 rounded-full text-sm h-8 px-3 flex items-center gap-2">
              <Layers className="size-4" />
              Real-Time Regulatory Monitoring
            </p>
            <div className="flex flex-col items-center justify-center gap-5 md:p-5 lg:p-0">
              <h1 className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-medium tracking-tighter text-balance text-center">
                Stay Ahead of Regulatory Changes with AI-Powered Compliance
                Monitoring
              </h1>
              <p className="text-sm md:text-lg text-center text-muted-foreground font-medium text-balance leading-relaxed tracking-tight">
                Monitor regulatory websites in real-time, get instant alerts on
                changes, and leverage AI-powered analysis to understand impact.
                Built for FinTech teams in emerging markets.
              </p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap justify-center">
              <Link
                href="/register"
                className="bg-primary h-9 flex items-center justify-center text-sm font-normal tracking-wide rounded-full text-primary-foreground dark:text-secondary-foreground w-32 px-4 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/12 hover:bg-primary/80 transition-all ease-out active:scale-95"
              >
                Try for Free
              </Link>
              <Link
                href="/login"
                className="h-9 flex items-center justify-center w-32 px-5 text-sm font-normal tracking-wide rounded-full transition-all ease-out active:scale-95 bg-white dark:bg-background border border-[#E5E7EB] dark:border-[#27272A] hover:bg-white/80 dark:hover:bg-background/80"
              >
                Log in
              </Link>
            </div>
          </div>
          <div>
            <HeroVideoDialog
              className="w-full h-[329px] md:h-[429px] lg:h-[629px] xl:h-[819px]"
              animationStyle="from-center"
              videoSrc="https://www.youtube.com/embed/rPmwrTU6gFM"
              thumbnailAlt="Regula Regulatory Compliance Monitoring Platform Demo Video"
              thumbnailSrc="/thumbnail.png"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
