"use client";

import { motion } from "framer-motion";
import { ArrowRight, BarChart3, FileText, Play } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const resources = [
  {
    title: "Compliance Guides",
    description: "Comprehensive guides on regulatory compliance for FinTechs",
    icon: FileText,
    href: "#",
    cta: "Read more",
  },
  {
    title: "Case Studies",
    description: "Real-world examples of how teams use Regula",
    icon: BarChart3,
    href: "#",
    cta: "Read more",
  },
  {
    title: "Webinars & Videos",
    description: "Watch product demos and expert sessions",
    icon: Play,
    href: "#",
    cta: "Watch now",
  },
];

export function Resources() {
  return (
    <section id="resources" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 className="text-3xl font-bold font-heading sm:text-4xl mb-4">
            Resources & Insights
          </h2>
          <p className="text-lg text-muted-foreground">
            Learn more about regulatory compliance and best practices.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {resources.map((resource) => (
            <motion.div
              key={resource.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-muted">
                <CardHeader>
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <resource.icon className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="font-heading">
                    {resource.title}
                  </CardTitle>
                  <CardDescription>{resource.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href={resource.href}
                    className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-2 group-hover:gap-3 transition-all"
                  >
                    {resource.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
