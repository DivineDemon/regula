"use client";

import { motion } from "framer-motion";
import { Twitter } from "lucide-react";
import { Marquee } from "@/components/ui/marquee";
import { testimonials } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Split testimonials into two rows for marquee
const firstRow = testimonials.slice(0, Math.ceil(testimonials.length / 2));
const secondRow = testimonials.slice(Math.ceil(testimonials.length / 2));

function TweetLikeCard({
  content,
  author,
  handle,
  avatar,
}: {
  content: string;
  author: string;
  handle: string;
  avatar: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-fit w-full max-w-sm flex-col gap-4 overflow-hidden rounded-xl border p-5 shrink-0",
        "hover:border-primary/50 transition-colors duration-300",
      )}
    >
      <div className="flex flex-row items-start justify-between tracking-normal">
        <div className="flex items-center space-x-3">
          {/* biome-ignore lint/performance/noImgElement: External avatar URLs from API, not suitable for Next.js Image optimization */}
          <img
            src={avatar}
            alt={author}
            height={48}
            width={48}
            className="border-border/50 overflow-hidden rounded-full border"
          />
          <div className="flex flex-col gap-0.5">
            <div className="text-foreground flex items-center font-medium whitespace-nowrap">
              {author}
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-muted-foreground text-sm">@{handle}</span>
            </div>
          </div>
        </div>
        <Twitter className="text-muted-foreground hover:text-foreground size-5 items-start transition-all ease-in-out hover:scale-105" />
      </div>
      <div className="text-[15px] leading-relaxed tracking-normal">
        <span className="text-foreground text-[15px] font-normal">
          {content}
        </span>
      </div>
    </div>
  );
}

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="w-full relative flex flex-col max-w-7xl mx-auto bg-muted/30 border-x"
    >
      <div className="w-full h-full flex flex-col items-start justify-start">
        <motion.div
          className="w-full p-10 md:p-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: false, margin: "-100px" }}
        >
          <div className="max-w-xl mx-auto flex flex-col items-center justify-center gap-2">
            <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-balance pb-1">
              Trusted by Compliance Teams Worldwide
            </h2>
            <p className="text-muted-foreground text-center text-balance font-medium">
              See what compliance professionals are saying about Regula's impact
              on their regulatory monitoring workflows.
            </p>
          </div>
        </motion.div>
        <motion.div
          className="relative flex w-full p-5 flex-col items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: false, margin: "-100px" }}
        >
          <Marquee pauseOnHover className="[--duration:20s]">
            {firstRow.map((testimonial) => (
              <TweetLikeCard
                key={testimonial.author}
                content={testimonial.content}
                author={testimonial.author}
                handle={testimonial.handle}
                avatar={testimonial.avatar}
              />
            ))}
          </Marquee>
          <Marquee reverse pauseOnHover className="[--duration:20s]">
            {secondRow.map((testimonial) => (
              <TweetLikeCard
                key={testimonial.author}
                content={testimonial.content}
                author={testimonial.author}
                handle={testimonial.handle}
                avatar={testimonial.avatar}
              />
            ))}
          </Marquee>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-linear-to-l from-background to-transparent" />
        </motion.div>
      </div>
    </section>
  );
}
