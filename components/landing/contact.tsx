import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DottedMap } from "@/components/ui/dotted-map";
import { SUPPORT } from "@/lib/constants";
import { ContactForm } from "./contact-form";

export function Contact() {
  return (
    <section
      id="contact"
      className="w-full relative flex flex-col max-w-7xl mx-auto border-x overflow-x-hidden"
    >
      <DottedMap
        markers={[
          { lat: 40.7128, lng: -74.006, size: 0.5 },
          { lat: 51.5074, lng: -0.1278, size: 0.5 },
          { lat: 35.6762, lng: 139.6503, size: 0.5 },
        ]}
        className="opacity-35 z-0 hidden lg:block"
      />
      <div className="relative lg:absolute lg:inset-0 z-1 grid grid-cols-1 lg:grid-cols-2 lg:items-stretch items-start justify-center bg-linear-to-tr from-primary/20 via-background to-primary/20">
        <div className="w-full h-full col-span-1 p-5 flex flex-col items-stretch justify-start lg:justify-center gap-8">
          <div className="w-full h-fit flex flex-col items-start justify-start gap-8 max-w-lg">
            <div className="w-full flex flex-col items-start justify-start gap-3">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground text-balance">
                Need help scoping coverage?
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                Talk to us about target lists, crawl expectations, and how your
                team runs regulatory ops. We respond within 24 hours.
                <br />
                <br />
                Prefer email?&nbsp;
                <Link
                  href={`mailto:${SUPPORT.email}`}
                  className="text-primary font-medium underline underline-offset-2 hover:no-underline"
                >
                  {SUPPORT.email}
                </Link>
              </p>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 w-full">
              <p className="text-sm font-semibold text-foreground mb-1">
                Pilot and enterprise assist
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                We&apos;re onboarding teams that need more targets, retention,
                or integration fit than self-serve tiers list today. Request a
                pilot to align on coverage and workflow—not a substitute for
                your compliance program or counsel.
              </p>
              <Button asChild size="sm" className="rounded-full">
                <Link href="/register">Request a pilot</Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="w-full h-full col-span-1 p-5 flex flex-col items-center justify-center gap-6">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
