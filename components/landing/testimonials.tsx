"use client";

import { Twitter } from "lucide-react";
import { Marquee } from "@/components/ui/marquee";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    content:
      "Regula has transformed how we monitor regulatory changes. We've eliminated hours of manual work and never miss a critical update.",
    author: "Sarah Chen",
    handle: "sarahchen",
    role: "Compliance Director",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
  },
  {
    content:
      "The AI-powered analysis is incredibly accurate. It helps us prioritize which regulatory changes actually impact our operations.",
    author: "Michael Okafor",
    handle: "mokafor",
    role: "Head of Risk",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
  },
  {
    content:
      "Setting up monitoring for multiple jurisdictions used to take weeks. With Regula, we were up and running in under an hour.",
    author: "Priya Sharma",
    handle: "priyasharma",
    role: "CTO",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
  },
  {
    content:
      "The real-time alerts have been a game-changer. We're always the first to know about regulatory updates in our markets.",
    author: "David Kim",
    handle: "davidkim",
    role: "VP of Compliance",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
  },
  {
    content:
      "Regula's impact scoring saves us countless hours. We focus on what matters most to our business operations.",
    author: "Maria Rodriguez",
    handle: "mariarod",
    role: "Regulatory Affairs Manager",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
  },
  {
    content:
      "The multi-channel notifications ensure our team never misses critical updates, no matter where they are.",
    author: "James Wilson",
    handle: "jameswilson",
    role: "Chief Compliance Officer",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
  },
];

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
    <section id="testimonials" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 className="text-3xl font-bold font-heading sm:text-4xl mb-4">
            Trusted by Compliance Teams
          </h2>
          <p className="text-lg text-muted-foreground">
            See what FinTech leaders are saying about Regula.
          </p>
        </div>
        <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
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
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-background to-transparent" />
        </div>
      </div>
    </section>
  );
}
