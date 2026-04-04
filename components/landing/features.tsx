import type { LucideIcon } from "lucide-react";
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
import type { ReactNode } from "react";
import { FeatureCardMotion, FeaturesIntroMotion } from "./features-client";

const REGULATOR_SITES = ["SBP", "SECP", "CBN", "BNM"] as const;

const AI_PIPELINE_STAGES = [
  "Analyzing…",
  "Summarizing…",
  "Scoring impact…",
] as const;

const AI_INSIGHTS = [
  { label: "Impact Score", value: "8.5/10", color: "text-primary" },
  { label: "Priority", value: "High", color: "text-orange-500" },
  { label: "Category", value: "Data Privacy", color: "text-blue-500" },
] as const;

const CHANNELS = [
  { name: "In-app", icon: LayoutDashboard },
  { name: "Email", icon: Mail },
  { name: "Slack", icon: Slack },
  { name: "Teams", icon: MessageSquare },
  { name: "Webhook", icon: Bell },
] as const;

const DIFF_LINES = [
  {
    line: "- Retention: 5 years for transaction records",
    tone: "removed" as const,
  },
  {
    line: "+ Retention: 7 years for transaction records",
    tone: "added" as const,
  },
  { line: "  … unchanged licensing requirements …", tone: "neutral" as const },
] as const;

const TEAM_MESSAGES = [
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
] as const;

const GOVERNANCE_CONTROLS = [
  "Organization audit logs",
  "GDPR export and deletion requests",
  "Data retention aligned to your policy",
  "Role-aware access in your workspace",
] as const;

function RealTimeMonitoringDemo() {
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
      <ul className="space-y-2 list-none p-0 m-0">
        {REGULATOR_SITES.map((site) => (
          <li
            key={site}
            className="flex items-center justify-between p-3 rounded-lg border bg-card"
          >
            <span className="text-sm flex-1">{site}</span>
            <div className="relative size-3 bg-green-500 rounded-full shrink-0">
              <div className="absolute inset-0 rounded-full bg-green-500 animate-ping" />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
        <p className="text-xs font-medium text-primary">
          Change detected on SBP
        </p>
      </div>
    </div>
  );
}

function AIPoweredAnalysisDemo() {
  return (
    <div className="p-6 h-[410px] flex flex-col justify-start gap-4">
      <div className="relative size-16 bg-primary/20 rounded-full mx-auto p-2 flex items-center justify-center gap-1">
        <div className="size-2 bg-primary rounded-full animate-bounce" />
        <div className="size-2 bg-primary rounded-full animate-bounce [animation-delay:100ms]" />
        <div className="size-2 bg-primary rounded-full animate-bounce [animation-delay:200ms]" />
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-sm font-medium">Analysis pipeline</p>
        <ul className="text-xs text-muted-foreground space-y-1 list-none p-0 m-0">
          {AI_PIPELINE_STAGES.map((stage) => (
            <li key={stage}>{stage}</li>
          ))}
        </ul>
      </div>
      <div className="space-y-3 mt-4">
        <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
          <div className="h-full w-full bg-primary rounded-full animate-pulse" />
        </div>
        <ul className="space-y-2 list-none p-0 m-0">
          {AI_INSIGHTS.map((insight) => (
            <li
              key={insight.label}
              className="flex items-center justify-between p-2 rounded-lg border bg-card"
            >
              <span className="text-xs text-muted-foreground">
                {insight.label}
              </span>
              <span className={`text-xs font-semibold ${insight.color}`}>
                {insight.value}
              </span>
            </li>
          ))}
        </ul>
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-xs text-muted-foreground leading-relaxed">
            &quot;New data retention requirements mandate 7-year storage period
            for financial records.&quot;
          </p>
        </div>
      </div>
    </div>
  );
}

function MultiChannelAlertsDemo() {
  return (
    <div className="p-6 h-[410px] flex flex-col justify-start gap-2">
      <ul className="space-y-2 list-none p-0 m-0">
        {CHANNELS.map((channel) => {
          const Icon = channel.icon;
          return (
            <li
              key={channel.name}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{channel.name}</p>
                <p className="text-xs text-muted-foreground">
                  New regulatory update
                </p>
              </div>
              <div className="relative size-3 bg-orange-500 rounded-full shrink-0">
                <div className="absolute inset-0 rounded-full bg-orange-500 animate-ping" />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function VersionIntelligenceDemo() {
  return (
    <div className="p-6 h-[410px] flex flex-col justify-start gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Version lineage</span>
        <span className="text-[10px] font-medium rounded-full bg-primary/15 text-primary px-2 py-0.5">
          Compare
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <p className="text-[10px] text-muted-foreground">Current</p>
          <p className="text-xs font-semibold">Circular v4</p>
          <p className="text-[10px] text-muted-foreground">Captured 2h ago</p>
        </div>
        <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
          <p className="text-[10px] text-muted-foreground">Previous</p>
          <p className="text-xs font-semibold">Circular v3</p>
          <p className="text-[10px] text-muted-foreground">6 days ago</p>
        </div>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center gap-2 border-b px-3 py-2 bg-muted/30">
          <GitCompare className="size-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium">Side-by-side diff</span>
        </div>
        <div className="p-3 space-y-2 font-mono text-[10px] leading-relaxed">
          {DIFF_LINES.map((row) => (
            <p
              key={row.line}
              className={`rounded px-2 py-1 ${
                row.tone === "added"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : row.tone === "removed"
                    ? "bg-red-500/10 text-red-700 dark:text-red-400"
                    : "text-muted-foreground"
              }`}
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

function TeamCollaborationDemo() {
  return (
    <div className="p-6 h-[410px] flex flex-col justify-end gap-2 overflow-hidden">
      <ul className="space-y-2 list-none p-0 m-0">
        {TEAM_MESSAGES.map((message, index) => {
          const isCurrentUser = message.isCurrentUser;
          const userInitial = isCurrentUser ? "Y" : message.user[0];
          return (
            <li
              key={`${message.user}-${index}`}
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ComplianceReadyDemo() {
  return (
    <div className="p-6 h-[410px] flex flex-col justify-start gap-3">
      <p className="text-xs text-muted-foreground mb-2">
        Controls you can operationalize today—no certification theater.
      </p>
      <ul className="space-y-2 list-none p-0 m-0">
        {GOVERNANCE_CONTROLS.map((label) => (
          <li
            key={label}
            className="flex items-center justify-between p-3 rounded-lg border bg-card"
          >
            <span className="text-sm font-medium">{label}</span>
            <CheckCircle2 className="w-5 h-5 text-muted-foreground/60 shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  );
}

type FeatureDef = {
  title: string;
  description: string;
  icon: LucideIcon;
  Demo: () => ReactNode;
};

const FEATURES: FeatureDef[] = [
  {
    title: "Adaptive Regulatory Monitoring",
    description:
      "Continuous crawling, discovery, and schedules that adapt to how sources change",
    icon: Zap,
    Demo: RealTimeMonitoringDemo,
  },
  {
    title: "Context-Aware AI Analysis",
    description:
      "Summaries, classification, impact scoring, and extraction—signal over raw diffs",
    icon: Sparkles,
    Demo: AIPoweredAnalysisDemo,
  },
  {
    title: "Version Intelligence & Evidence",
    description:
      "History, side-by-side compare, and navigation across related versions",
    icon: GitCompare,
    Demo: VersionIntelligenceDemo,
  },
  {
    title: "Multi-Channel Delivery",
    description:
      "In-app, email digests, Slack, Teams, and webhooks where you work",
    icon: Bell,
    Demo: MultiChannelAlertsDemo,
  },
  {
    title: "Compliance Team Workspace",
    description:
      "Assignments, comments, triage, snoozes, and lifecycle without leaving the app",
    icon: Users,
    Demo: TeamCollaborationDemo,
  },
  {
    title: "Governance and Trust Controls",
    description:
      "Audit logs, consent, GDPR export and deletion, retention, and role-aware access",
    icon: Shield,
    Demo: ComplianceReadyDemo,
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="w-full min-h-screen relative flex flex-col max-w-7xl mx-auto border-x"
    >
      <div className="absolute top-0 right-0 h-full w-4 md:w-14 text-border bg-size-[10px_10px] bg-[repeating-linear-gradient(315deg,currentColor_0_1px,#0000_0_50%)]" />
      <div className="w-[calc(100%-32px)] md:w-[calc(100%-112px)] xl:w-[calc(100%-112px)] mx-auto h-full border-x flex flex-col items-start justify-start">
        <FeaturesIntroMotion>
          <div className="max-w-xl mx-auto flex flex-col items-center justify-center gap-2">
            <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-balance pb-1">
              A Regulatory Operations System, Not a Document Watcher
            </h2>
            <p className="text-muted-foreground text-center text-balance font-medium">
              From discovery to triage and export, Regula connects detection,
              scoring, and team action in one workflow—use Analytics to review
              engagement and operational signals in your organization.
            </p>
          </div>
        </FeaturesIntroMotion>
        <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2">
          {FEATURES.map((feature, index) => {
            const Demo = feature.Demo;
            return (
              <FeatureCardMotion key={feature.title} index={index}>
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
                <Demo />
              </FeatureCardMotion>
            );
          })}
        </div>
      </div>
      <div className="absolute top-0 left-0 h-full w-4 md:w-14 text-border bg-size-[10px_10px] bg-[repeating-linear-gradient(315deg,currentColor_0_1px,#0000_0_50%)]" />
    </section>
  );
}
