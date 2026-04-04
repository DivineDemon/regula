"use client";

import { motion } from "framer-motion";
import {
  Bell,
  CheckCircle2,
  GitCompare,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Shield,
  Slack,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

const features = [
  {
    title: "Adaptive Regulatory Monitoring",
    description:
      "Continuous crawling, discovery, and schedules that adapt to how sources change",
    icon: Zap,
    component: RealTimeMonitoring,
  },
  {
    title: "Context-Aware AI Analysis",
    description:
      "Summaries, classification, impact scoring, and extraction—signal over raw diffs",
    icon: Sparkles,
    component: AIPoweredAnalysis,
  },
  {
    title: "Version Intelligence & Evidence",
    description:
      "History, side-by-side compare, and navigation across related versions",
    icon: GitCompare,
    component: VersionIntelligence,
  },
  {
    title: "Multi-Channel Delivery",
    description:
      "In-app, email digests, Slack, Teams, and webhooks where you work",
    icon: Bell,
    component: MultiChannelAlerts,
  },
  {
    title: "Compliance Team Workspace",
    description:
      "Assignments, comments, triage, snoozes, and lifecycle without leaving the app",
    icon: Users,
    component: TeamCollaboration,
  },
  {
    title: "Governance and Trust Controls",
    description:
      "Audit logs, consent, GDPR export and deletion, retention, and role-aware access",
    icon: Shield,
    component: ComplianceReady,
  },
];

const REGULATOR_SITES = ["SBP", "SECP", "CBN", "BNM"];

function RealTimeMonitoring() {
  const [status, setStatus] = useState("monitoring");

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus((prev) => (prev === "monitoring" ? "detected" : "monitoring"));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 flex h-[410px] flex-col justify-start gap-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative size-4 bg-primary rounded-full">
          <div className="absolute inset-0 rounded-full bg-primary animate-ping" />
        </div>
        <span className="text-sm font-medium flex-1">Adaptive coverage</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {REGULATOR_SITES.length} sources
        </span>
      </div>
      <div className="space-y-2">
        {REGULATOR_SITES.map((site, i) => (
          <motion.div
            key={site}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.2 }}
            className="flex items-center justify-between p-3 rounded-lg border bg-card"
          >
            <span className="text-sm flex-1">{site}</span>
            <div className="relative size-3 bg-green-500 rounded-full">
              <div className="absolute inset-0 rounded-full bg-green-500 animate-ping" />
            </div>
          </motion.div>
        ))}
      </div>
      {status === "detected" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20"
        >
          <p className="text-xs font-medium text-primary">
            Change detected on SBP
          </p>
        </motion.div>
      )}
    </div>
  );
}

function AIPoweredAnalysis() {
  const [analysisStage, setAnalysisStage] = useState(0);
  const stages = ["Analyzing...", "Summarizing...", "Scoring impact..."];

  useEffect(() => {
    const interval = setInterval(() => {
      setAnalysisStage((prev) => (prev + 1) % stages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const insights = [
    { label: "Impact Score", value: "8.5/10", color: "text-primary" },
    { label: "Priority", value: "High", color: "text-orange-500" },
    { label: "Category", value: "Data Privacy", color: "text-blue-500" },
  ];

  return (
    <div className="p-6 h-[410px] flex flex-col justify-start gap-4">
      <div className="relative size-16 bg-primary/20 rounded-full mx-auto p-2 flex items-center justify-center gap-1">
        <div className="size-2 bg-primary rounded-full animate-bounce" />
        <div className="size-2 bg-primary rounded-full animate-bounce delay-100" />
        <div className="size-2 bg-primary rounded-full animate-bounce delay-200" />
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
      </div>
      <div className="text-center space-y-2">
        <motion.p
          key={analysisStage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-medium"
        >
          {stages[analysisStage]}
        </motion.p>
        <div className="flex gap-1 justify-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary"
              animate={{
                scale: analysisStage === i ? [1, 1.3, 1] : 1,
                opacity: analysisStage === i ? 1 : 0.3,
              }}
              transition={{ duration: 0.5 }}
            />
          ))}
        </div>
      </div>
      <div className="space-y-3 mt-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
          className="h-2 bg-primary/20 rounded-full overflow-hidden"
        >
          <div className="h-full bg-primary rounded-full" />
        </motion.div>
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <motion.div
              key={insight.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.2 }}
              className="flex items-center justify-between p-2 rounded-lg border bg-card"
            >
              <span className="text-xs text-muted-foreground">
                {insight.label}
              </span>
              <span className={`text-xs font-semibold ${insight.color}`}>
                {insight.value}
              </span>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="p-3 rounded-lg bg-primary/5 border border-primary/10"
        >
          <p className="text-xs text-muted-foreground leading-relaxed">
            "New data retention requirements mandate 7-year storage period for
            financial records."
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function MultiChannelAlerts() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const channels = [
    { name: "In-app", icon: LayoutDashboard },
    { name: "Email", icon: Mail },
    { name: "Slack", icon: Slack },
    { name: "Teams", icon: MessageSquare },
    { name: "Webhook", icon: Bell },
  ];

  useEffect(() => {
    const cycle = () => {
      setIsVisible(true);
      setIsExiting(false);

      const fadeInDuration = channels.length * 200 + 1000;
      setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          setIsVisible(false);
          setIsExiting(false);
          setTimeout(cycle, 500);
        }, 500);
      }, fadeInDuration);
    };

    cycle();
  }, [channels.length]);

  return (
    <div className="p-6 h-[410px] flex flex-col justify-start gap-2">
      {channels.map((channel, index) => {
        const Icon = channel.icon;
        return (
          <motion.div
            key={channel.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{
              opacity: isVisible && !isExiting ? 1 : 0,
              x: isExiting ? -100 : isVisible ? 0 : -20,
            }}
            transition={{
              opacity: {
                delay: isVisible && !isExiting ? index * 0.2 : 0,
                duration: 0.3,
              },
              x: {
                delay: isExiting ? 0 : isVisible ? index * 0.2 : 0,
                duration: 0.5,
              },
            }}
            className="flex items-center gap-3 p-3 rounded-lg border bg-card"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium">{channel.name}</p>
              <p className="text-xs text-muted-foreground">
                New regulatory update
              </p>
            </div>
            <div className="relative size-3 bg-orange-500 rounded-full">
              <div className="absolute inset-0 rounded-full bg-orange-500 animate-ping" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function VersionIntelligence() {
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHighlight((prev) => (prev + 1) % 3);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 h-[410px] flex flex-col justify-start gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Version lineage</span>
        <span className="text-[10px] font-medium rounded-full bg-primary/15 text-primary px-2 py-0.5">
          Compare
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <motion.div
          className="rounded-lg border bg-card p-3 space-y-2"
          animate={{ opacity: highlight === 1 ? 0.85 : 1 }}
        >
          <p className="text-[10px] text-muted-foreground">Current</p>
          <p className="text-xs font-semibold">Circular v4</p>
          <p className="text-[10px] text-muted-foreground">Captured 2h ago</p>
        </motion.div>
        <motion.div
          className="rounded-lg border bg-muted/40 p-3 space-y-2"
          animate={{ opacity: highlight === 2 ? 0.85 : 1 }}
        >
          <p className="text-[10px] text-muted-foreground">Previous</p>
          <p className="text-xs font-semibold">Circular v3</p>
          <p className="text-[10px] text-muted-foreground">6 days ago</p>
        </motion.div>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center gap-2 border-b px-3 py-2 bg-muted/30">
          <GitCompare className="size-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium">Side-by-side diff</span>
        </div>
        <div className="p-3 space-y-2 font-mono text-[10px] leading-relaxed">
          {[
            {
              line: "- Retention: 5 years for transaction records",
              tone: "removed",
            },
            {
              line: "+ Retention: 7 years for transaction records",
              tone: "added",
            },
            { line: "  … unchanged licensing requirements …", tone: "neutral" },
          ].map((row, i) => (
            <p
              key={row.line}
              className={`rounded px-2 py-1 transition-shadow duration-300 ${
                row.tone === "added"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : row.tone === "removed"
                    ? "bg-red-500/10 text-red-700 dark:text-red-400"
                    : "text-muted-foreground"
              } ${highlight === i ? "ring-2 ring-primary/35 ring-offset-2 ring-offset-background" : ""}`}
            >
              {row.line}
            </p>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Open related versions and attach evidence to audit-ready threads.
      </p>
    </div>
  );
}

function TeamCollaboration() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const messages = [
    {
      user: "Sarah",
      text: "Can you own triage on this alert?",
      isCurrentUser: false,
    },
    {
      user: "You",
      text: "Assigned to Legal — added context in thread",
      isCurrentUser: true,
    },
    {
      user: "Priya",
      text: "Snoozed until after board prep; flagged not FP",
      isCurrentUser: false,
    },
    {
      user: "John",
      text: "Policy change looks high impact — need sign-off",
      isCurrentUser: false,
    },
    {
      user: "Jane",
      text: "Tagged AML — bulk-updated related items",
      isCurrentUser: false,
    },
    {
      user: "You",
      text: "Resolved with evidence link in audit trail",
      isCurrentUser: true,
    },
  ];

  useEffect(() => {
    const cycle = () => {
      setIsVisible(true);
      setIsExiting(false);

      const fadeInDuration = messages.length * 200 + 1500;
      setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          setIsVisible(false);
          setIsExiting(false);
          setTimeout(cycle, 500);
        }, 500);
      }, fadeInDuration);
    };

    cycle();
  }, []);

  return (
    <div className="p-6 h-[410px] flex flex-col justify-end gap-2 overflow-hidden">
      {messages.map((message, index) => {
        const isCurrentUser = message.isCurrentUser;
        const userInitial = isCurrentUser ? "Y" : message.user[0];

        return (
          <motion.div
            key={`${message.user}-${index}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: isVisible && !isExiting ? 1 : 0,
              y: isExiting ? -20 : isVisible ? 0 : 20,
              scale: isVisible && !isExiting ? 1 : 0.95,
            }}
            transition={{
              opacity: {
                delay: isVisible && !isExiting ? index * 0.2 : 0,
                duration: 0.3,
              },
              y: {
                delay: isExiting ? 0 : isVisible ? index * 0.2 : 0,
                duration: 0.4,
              },
              scale: {
                delay: isVisible && !isExiting ? index * 0.2 : 0,
                duration: 0.3,
              },
            }}
            className={`flex items-end gap-2 ${
              isCurrentUser ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                isCurrentUser ? "bg-primary/30" : "bg-primary/20"
              }`}
            >
              <span className="text-[10px] font-medium text-primary">
                {userInitial}
              </span>
            </div>
            <div
              className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                isCurrentUser
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              {!isCurrentUser && (
                <p className="text-[10px] font-semibold mb-1 opacity-80">
                  {message.user}
                </p>
              )}
              <p className="text-xs leading-relaxed">{message.text}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

const GOVERNANCE_CONTROLS = [
  "Organization audit logs",
  "GDPR export and deletion requests",
  "Data retention aligned to your policy",
  "Role-aware access in your workspace",
] as const;

function ComplianceReady() {
  return (
    <div className="p-6 h-[410px] flex flex-col justify-start gap-3">
      <p className="text-xs text-muted-foreground mb-2">
        Controls you can operationalize today—no certification theater.
      </p>
      {GOVERNANCE_CONTROLS.map((label) => (
        <motion.div
          key={label}
          className="flex items-center justify-between p-3 rounded-lg border bg-card"
          whileHover={{ scale: 1.02 }}
        >
          <span className="text-sm font-medium">{label}</span>
          <CheckCircle2 className="w-5 h-5 text-muted-foreground/60 shrink-0" />
        </motion.div>
      ))}
    </div>
  );
}

export function Features() {
  return (
    <section
      id="features"
      className="w-full min-h-screen relative flex flex-col max-w-7xl mx-auto border-x"
    >
      <div className="absolute top-0 right-0 h-full w-4 md:w-14 text-border bg-size-[10px_10px] bg-[repeating-linear-gradient(315deg,currentColor_0_1px,#0000_0_50%)]" />
      <div className="w-[calc(100%-32px)] md:w-[calc(100%-112px)] xl:w-[calc(100%-112px)] mx-auto h-full border-x flex flex-col items-start justify-start">
        <motion.div
          className="border-b w-full p-10 md:p-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: false, margin: "-100px" }}
        >
          <div className="max-w-xl mx-auto flex flex-col items-center justify-center gap-2">
            <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-balance pb-1">
              A Regulatory Operations System, Not a Document Watcher
            </h2>
            <p className="text-muted-foreground text-center text-balance font-medium">
              From coverage discovery to compliance execution, Regula connects
              detection, intelligence, and team action in one workflow.
            </p>
          </div>
        </motion.div>
        <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2">
          {features.map((feature, index) => {
            const FeatureComponent = feature.component;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: false, margin: "-100px" }}
                className="w-full h-full last:border-t lg:last:border-t-0 lg:border-r even:border-r-0 border-b nth-5:border-b-0 nth-6:border-b-0 hover:bg-muted/30 transition-colors group"
              >
                <div className="p-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{feature.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
                <FeatureComponent />
              </motion.div>
            );
          })}
        </div>
      </div>
      <div className="absolute top-0 left-0 h-full w-4 md:w-14 text-border bg-size-[10px_10px] bg-[repeating-linear-gradient(315deg,currentColor_0_1px,#0000_0_50%)]" />
    </section>
  );
}
