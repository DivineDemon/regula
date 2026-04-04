import Image from "next/image";

const primaryCta = "Start free — monitor 3 targets today";
const supportText = "No credit card required";

export function CTA() {
  return (
    <section className="w-full flex flex-col max-w-7xl mx-auto border-x">
      {/* Mobile & tablet: compact conversion block */}
      <div className="w-full px-4 py-8 sm:px-6 md:py-10 xl:hidden">
        <div className="w-full rounded-2xl sm:rounded-3xl bg-primary px-6 py-10 sm:px-8 sm:py-12 flex flex-col items-center justify-center text-center gap-5 relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, white 0%, transparent 45%), radial-gradient(circle at 80% 80%, white 0%, transparent 40%)",
            }}
            aria-hidden
          />
          <h2 className="relative z-1 text-white text-2xl sm:text-3xl font-medium tracking-tighter max-w-md sm:max-w-lg">
            Automate.
            <br />
            Simplify. Thrive
          </h2>
          <div className="relative z-1 flex flex-col items-center gap-2">
            <a
              className="bg-white text-black font-semibold text-sm h-11 w-fit px-5 rounded-full inline-flex items-center justify-center shadow-md hover:bg-white/90 transition-colors"
              href="/register"
            >
              {primaryCta}
            </a>
            <span className="text-white/90 text-sm">{supportText}</span>
          </div>
        </div>
      </div>

      {/* Desktop: full-bleed image treatment */}
      <div className="hidden xl:flex flex-col w-full">
        <div className="w-full rounded-3xl bg-primary overflow-hidden relative">
          <Image
            src="/agent-cta-background.webp"
            alt="Regula regulatory operations platform — start free"
            className="w-full z-0"
            width={1000}
            height={1000}
          />
          <div className="absolute inset-0 -top-32 md:-top-40 flex flex-col items-center justify-center">
            <h2 className="text-white text-4xl md:text-7xl font-medium tracking-tighter max-w-xs md:max-w-3xl text-center px-4">
              Automate.
              <br />
              Simplify. Thrive
            </h2>
            <div className="absolute bottom-10 flex flex-col items-center justify-center gap-2">
              <a
                className="bg-white text-black font-semibold text-sm h-10 w-fit px-4 rounded-full flex items-center justify-center shadow-md hover:bg-white/90 transition-colors"
                href="/register"
              >
                {primaryCta}
              </a>
              <span className="text-white text-sm">{supportText}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
