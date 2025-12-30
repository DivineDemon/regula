"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  CheckCircle2,
  Mail,
  MessageSquare,
  Search,
  Shield,
  Slack,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

const features = [
  {
    title: "Real-Time Monitoring",
    description:
      "Continuous monitoring of regulatory websites with instant change detection",
    icon: Zap,
    component: RealTimeMonitoring,
  },
  {
    title: "AI-Powered Analysis",
    description:
      "Intelligent summaries and impact scoring powered by Google Gemini",
    icon: Search,
    component: AIPoweredAnalysis,
  },
  {
    title: "Multi-Channel Alerts",
    description: "Receive notifications where you work, when you need them",
    icon: Bell,
    component: MultiChannelAlerts,
  },
  {
    title: "Analytics & Dashboard",
    description:
      "Comprehensive metrics and visualizations to track compliance health",
    icon: BarChart3,
    component: AnalyticsDashboard,
  },
  {
    title: "Team Collaboration",
    description: "Work together with your compliance team effectively",
    icon: Users,
    component: TeamCollaboration,
  },
  {
    title: "Compliance Ready",
    description: "Enterprise-grade security and audit capabilities",
    icon: Shield,
    component: ComplianceReady,
  },
];

function RealTimeMonitoring() {
  const [status, setStatus] = useState("monitoring");
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => (prev + 1) % 100);
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
        <span className="text-sm font-medium flex-1">Live Monitoring</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {count} sites
        </span>
      </div>
      <div className="space-y-2">
        {["SEC.gov", "FCA.org.uk", "ASIC.gov.au", "MAS.gov.sg"].map(
          (site, i) => (
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
          ),
        )}
      </div>
      {status === "detected" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20"
        >
          <p className="text-xs font-medium text-primary">
            Change detected on SEC.gov
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
    { name: "Email", icon: Mail },
    { name: "Slack", icon: Slack },
    { name: "Teams", icon: MessageSquare },
    { name: "Webhook", icon: Bell },
    { name: "SMS", icon: MessageSquare },
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

function AnalyticsDashboard() {
  const [data, setData] = useState([20, 35, 45, 30, 50, 40, 60]);

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) =>
        prev.map((v) =>
          Math.max(10, Math.min(80, v + (Math.random() - 0.5) * 10)),
        ),
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const maxValue = Math.max(...data);

  return (
    <div className="p-6 w-full h-[410px] flex flex-col items-start justify-start gap-4">
      <div className="w-full flex flex-col items-start justify-start gap-1">
        <div className="w-full flex items-baseline gap-2">
          <span className="text-2xl font-bold">{maxValue.toFixed(2)}</span>
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        <p className="text-xs text-muted-foreground">Alerts this month</p>
      </div>
      <div className="flex items-end gap-2 w-full h-full">
        {data.map((value, i) => {
          const key = `chart-bar-${i}-${value}`;
          return (
            <motion.div
              key={key}
              className="flex-1 flex flex-col items-center gap-1"
              initial={{ height: 0 }}
              animate={{ height: `${(value / maxValue) * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
            >
              <motion.div
                className="w-full rounded-t bg-primary relative overflow-hidden"
                animate={{ height: "100%" }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
              >
                <motion.div
                  className="absolute inset-0 bg-linear-to-t from-primary/50 to-primary"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              <span className="text-[10px] text-muted-foreground">
                {["M", "T", "W", "T", "F", "S", "S"][i]}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function TeamCollaboration() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const messages = [
    { user: "Sarah", text: "This needs review", isCurrentUser: false },
    { user: "You", text: "I'll take a look", isCurrentUser: true },
    {
      user: "Priya",
      text: "Let's discuss this in the meeting",
      isCurrentUser: false,
    },
    {
      user: "John",
      text: "This is critical - needs immediate attention",
      isCurrentUser: false,
    },
    { user: "Jane", text: "I can help with that", isCurrentUser: false },
    { user: "You", text: "Perfect, let's sync up", isCurrentUser: true },
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

function ComplianceReady() {
  const [badges, setBadges] = useState<
    Array<{ id: number; name: string; checked: boolean }>
  >([
    { id: 1, name: "GDPR", checked: false },
    { id: 2, name: "SOC 2", checked: false },
    { id: 3, name: "HIPAA", checked: false },
    { id: 4, name: "PCI DSS", checked: false },
    { id: 5, name: "ISO 27001", checked: false },
    { id: 6, name: "ISO 27002", checked: false },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setBadges((prev) => {
        const unchecked = prev.filter((b) => !b.checked);
        if (unchecked.length > 0) {
          const randomIndex = Math.floor(Math.random() * unchecked.length);
          return prev.map((b) =>
            b.id === unchecked[randomIndex].id ? { ...b, checked: true } : b,
          );
        }
        return prev.map((b) => ({ ...b, checked: false }));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 h-[410px] flex flex-col justify-start gap-3">
      {badges.map((badge) => (
        <motion.div
          key={badge.id}
          className="flex items-center justify-between p-3 rounded-lg border bg-card"
          whileHover={{ scale: 1.02 }}
        >
          <span className="text-sm font-medium">{badge.name}</span>
          <motion.div
            initial={false}
            animate={{
              scale: badge.checked ? [1, 1.2, 1] : 1,
              opacity: badge.checked ? 1 : 0.3,
            }}
          >
            <CheckCircle2
              className={`w-5 h-5 ${
                badge.checked ? "text-primary" : "text-muted-foreground"
              }`}
            />
          </motion.div>
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
      <div className="w-[calc(100%-112px)] mx-auto h-full border-x flex flex-col items-start justify-start">
        <motion.div
          className="border-b w-full p-10 md:p-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: false, margin: "-100px" }}
        >
          <div className="max-w-xl mx-auto flex flex-col items-center justify-center gap-2">
            <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-balance pb-1">
              Everything You Need for Regulatory Compliance
            </h2>
            <p className="text-muted-foreground text-center text-balance font-medium">
              Comprehensive tools designed specifically for FinTech teams in
              emerging markets.
            </p>
          </div>
        </motion.div>
        <div className="w-full h-full grid grid-cols-2">
          {features.map((feature, index) => {
            const FeatureComponent = feature.component;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: false, margin: "-100px" }}
                className="w-full h-full border-r even:border-r-0 border-b nth-5:border-b-0 nth-6:border-b-0 hover:bg-muted/30 transition-colors group"
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
