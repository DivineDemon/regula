"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { sendContactEmail } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { DottedMap } from "@/components/ui/dotted-map";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SUPPORT } from "@/lib/constants";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const result = await sendContactEmail(values);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Message sent successfully! We'll be in touch soon.");
        form.reset();
      }
    } catch (_error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

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
        <motion.div
          className="w-full h-full col-span-1 p-5 flex flex-col items-stretch justify-start lg:justify-center gap-8"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: false, margin: "-100px" }}
        >
          <div className="w-full h-fit flex flex-col items-start justify-start gap-8 max-w-lg">
            <div className="w-full flex flex-col items-start justify-start gap-3">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground text-balance">
                Need jurisdiction-specific coverage ?
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                Talk to us about multi-jurisdiction rollouts, and how your team
                runs regulatory ops. We respond within 24 hours.
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
                We&apos;re onboarding teams that need deeper coverage and
                workflow fit—especially across SBP, CBN, and MENA contexts.
                Request a pilot to get early access and shape the roadmap with
                us.
              </p>
              <Button asChild size="sm" className="rounded-full">
                <Link href="/register">Request a pilot</Link>
              </Button>
            </div>
          </div>
        </motion.div>
        <motion.div
          className="w-full h-full col-span-1 p-5 flex flex-col items-center justify-center gap-6"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: false, margin: "-100px" }}
        >
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="w-full h-full flex flex-col items-center justify-center gap-6"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="w-full flex flex-col items-start justify-start">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="w-full flex flex-col items-start justify-start">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="john@example.com"
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem className="w-full flex flex-col items-start justify-start">
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us how we can help..."
                        className="min-h-[120px] w-full"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </Form>
        </motion.div>
      </div>
    </section>
  );
}
