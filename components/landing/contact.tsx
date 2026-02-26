"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Clock, Loader2, Mail, MapPin, Phone, Send } from "lucide-react";
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
      <div className="relative lg:absolute lg:inset-0 z-1 grid grid-cols-1 lg:grid-cols-2 items-center justify-center bg-linear-to-tr from-primary/20 via-background to-primary/20">
        <motion.div
          className="w-full h-full col-span-1 p-5 flex flex-col items-center justify-center gap-6"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: false, margin: "-100px" }}
        >
          <div className="w-full h-fit flex flex-col items-start justify-start gap-3">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">
              Have questions?
            </h2>
            <p className="text-base text-muted-foreground max-w-md leading-relaxed">
              We're here to help. Please fill out the form below and we'll get
              back to you as soon as possible.
            </p>
          </div>
          <div className="w-full hidden lg:flex flex-col items-start justify-start gap-4">
            {[
              {
                icon: MapPin,
                text: "123 Business Street, San Francisco, CA 94105",
              },
              { icon: Phone, text: "+1 (555) 123-4567" },
              { icon: Mail, text: "hello@regula.com" },
              { icon: Clock, text: "Monday - Friday: 9:00 AM - 5:00 PM" },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.text}
                  className="flex items-center justify-start gap-3 p-3 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50 w-full"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  viewport={{ once: false, margin: "-100px" }}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm text-foreground font-medium">
                    {item.text}
                  </span>
                </motion.div>
              );
            })}
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
