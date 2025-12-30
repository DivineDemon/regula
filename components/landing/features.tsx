"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  CheckCircle2,
  Search,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "Real-Time Monitoring",
    description:
      "Continuous monitoring of regulatory websites with instant change detection",
    icon: Zap,
    items: [
      "Automated crawling and version tracking",
      "Intelligent diff engine for change detection",
      "Multi-jurisdiction support",
    ],
  },
  {
    title: "AI-Powered Analysis",
    description:
      "Intelligent summaries and impact scoring powered by Google Gemini",
    icon: Search,
    items: [
      "Automated summarization of changes",
      "Impact scoring and prioritization",
      "Category classification",
    ],
  },
  {
    title: "Multi-Channel Alerts",
    description: "Receive notifications where you work, when you need them",
    icon: Bell,
    items: [
      "Email notifications & digests",
      "Slack & Microsoft Teams integration",
      "Custom webhook support",
    ],
  },
  {
    title: "Analytics & Dashboard",
    description:
      "Comprehensive metrics and visualizations to track compliance health",
    icon: BarChart3,
    items: [
      "Real-time alert metrics",
      "Trends and pattern analysis",
      "Usage tracking and quotas",
    ],
  },
  {
    title: "Team Collaboration",
    description: "Work together with your compliance team effectively",
    icon: Users,
    items: [
      "Alert assignments and comments",
      "Role-based access control",
      "Version comparison tools",
    ],
  },
  {
    title: "Compliance Ready",
    description: "Enterprise-grade security and audit capabilities",
    icon: Shield,
    items: [
      "Complete audit trails",
      "PDF & CSV export",
      "GDPR compliant data management",
    ],
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 className="text-3xl font-bold font-heading sm:text-4xl mb-4">
            Everything You Need for Regulatory Compliance
          </h2>
          <p className="text-lg text-muted-foreground">
            Comprehensive tools designed specifically for FinTech teams in
            emerging markets.
          </p>
        </div>
        <div className="grid gap-4 md:gap-6 auto-rows-fr grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            // Make first two features span 2 columns for visual hierarchy
            const spanClass =
              index === 0 || index === 1
                ? "md:col-span-2"
                : index === 2
                  ? "md:col-span-2 lg:col-span-1"
                  : "";
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={cn("group", spanClass)}
              >
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="h-full"
                >
                  <Card
                    className={cn(
                      "h-full border-muted/50 hover:shadow-lg transition-all duration-300",
                      "group-hover:border-primary/20",
                    )}
                  >
                    <CardHeader>
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="font-heading">
                        {feature.title}
                      </CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 text-sm text-muted-foreground">
                        {feature.items.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
