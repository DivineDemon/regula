import { Layers } from "lucide-react";
import Link from "next/link";
import { HeroVideoDialog } from "../ui/hero-video-dialog";

/** Canonical hero copy — keep JSON-LD and on-page text in sync. */
export const LANDING_HERO_HEADLINE =
  "Regulatory Operations for Emerging-Market FinTech Teams" as const;

export const LANDING_HERO_DESCRIPTION =
  "Discover targets, crawl on a schedule you choose, detect material changes, and route them into triage workflows with history you can export—then measure engagement and coverage in Analytics." as const;

const HERO_TRUST_CHIPS = [
  "Free: 3 targets · daily crawls (see Pricing)",
  "Impact scoring, diffs & version compare",
  "Analytics, audit logs, CSV/PDF export",
] as const;

export function Hero() {
  return (
    <section className="w-full relative flex flex-col max-w-7xl mx-auto border-x">
      <div className="absolute inset-0 -z-10 h-[600px] md:h-[800px] w-full [background:radial-gradient(125%_125%_at_50%_10%,var(--background)_40%,var(--primary)_100%)] rounded-b-xl" />
      <div className="w-full px-6 min-h-screen">
        <div className="w-full h-full border-x flex flex-col items-center justify-center gap-8 xl:gap-12">
          <div className="pt-32 max-w-3xl mx-auto h-full w-full flex flex-col gap-10 items-center justify-center">
            <p className="bg-accent/50 rounded-full text-sm h-8 px-3 flex items-center gap-2 max-w-[calc(100vw-3rem)]">
              <Layers className="size-4 shrink-0" />
              <span className="truncate sm:whitespace-normal">
                Regulatory change monitoring
              </span>
            </p>
            <div className="flex flex-col items-center justify-center gap-5 md:p-5 lg:p-0">
              <h1 className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-medium tracking-tighter text-balance text-center">
                {LANDING_HERO_HEADLINE}
              </h1>
              <p className="text-sm md:text-lg text-center text-muted-foreground font-medium text-balance leading-relaxed tracking-tight">
                {LANDING_HERO_DESCRIPTION}
              </p>
            </div>
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="flex items-center gap-2.5 flex-wrap justify-center">
                <Link
                  href="/register"
                  className="bg-primary h-9 flex items-center justify-center text-sm font-normal tracking-wide rounded-full text-primary-foreground dark:text-secondary-foreground min-w-32 px-5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/12 hover:bg-primary/80 transition-all ease-out active:scale-95"
                >
                  Start Free
                </Link>
                <Link
                  href="/login"
                  className="h-9 flex items-center justify-center w-32 px-5 text-sm font-normal tracking-wide rounded-full transition-all ease-out active:scale-95 bg-white dark:bg-background border border-[#E5E7EB] dark:border-[#27272A] hover:bg-white/80 dark:hover:bg-background/80"
                >
                  Log in
                </Link>
              </div>
              <ul className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-2 sm:gap-x-3 sm:gap-y-2 text-xs text-muted-foreground text-center max-w-2xl">
                {HERO_TRUST_CHIPS.map((label) => (
                  <li
                    key={label}
                    className="rounded-full border border-border/80 bg-muted/30 px-3 py-1 font-medium"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <HeroVideoDialog
              className="w-full h-[329px] md:h-[429px] lg:h-[629px] xl:h-[819px]"
              animationStyle="from-center"
              videoSrc="https://www.loom.com/embed/fbb76d70095a4119ad2c95364bc778dc"
              thumbnailAlt="Regula product demo: target discovery, change detection, impact scoring, team assignment, and audit history"
              thumbnailSrc="/thumbnail.png"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
