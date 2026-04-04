/** Application domain (used for emails, docs, and public URLs when env is not set) */
export const APP_DOMAIN = "regula.mushoodhanif.com";

/** Support & help links (e.g. marketing, legal pages; use NEXT_PUBLIC_ vars for client-visible values) */
export const SUPPORT = {
  email:
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ??
    process.env.SUPPORT_EMAIL ??
    `support@${APP_DOMAIN}`,
  docsUrl: process.env.NEXT_PUBLIC_DOCS_URL ?? `https://${APP_DOMAIN}/docs`,
  statusPageUrl:
    process.env.NEXT_PUBLIC_STATUS_PAGE_URL ?? `https://${APP_DOMAIN}/status`,
} as const;

export const navbarItems = [
  {
    label: "Features",
    href: "#features",
  },
  {
    label: "Comparison",
    href: "#comparison",
  },
  {
    label: "Pricing",
    href: "#pricing",
  },
  {
    label: "Contact",
    href: "#contact",
  },
];

export const actionOptions = [
  { value: "all", label: "All Actions" },
  { value: "user.login", label: "User Login" },
  { value: "user.logout", label: "User Logout" },
  { value: "target.created", label: "Target Created" },
  { value: "target.updated", label: "Target Updated" },
  { value: "target.deleted", label: "Target Deleted" },
  { value: "alert.created", label: "Alert Created" },
  { value: "alert.status_changed", label: "Alert Status Changed" },
  { value: "alert.assigned", label: "Alert Assigned" },
  { value: "alert.comment_added", label: "Alert Comment Added" },
  { value: "alert.exported", label: "Alert Exported" },
  { value: "organization.member_invited", label: "Member Invited" },
  { value: "organization.member_removed", label: "Member Removed" },
  { value: "organization.member_role_changed", label: "Member Role Changed" },
  { value: "billing.subscription_created", label: "Subscription Created" },
  { value: "billing.subscription_updated", label: "Subscription Updated" },
  { value: "export.alerts", label: "Alerts Exported" },
];

export const testimonials = [
  {
    content:
      "Regula centralizes how we watch regulatory sites—fewer spreadsheets, and alerts land with context we can assign and close in one place.",
    author: "Sarah Chen",
    handle: "sarahchen",
    role: "Compliance Director",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
  },
  {
    content:
      "Summaries and impact scores help us triage faster; we still verify anything that goes to legal, but the signal-to-noise is much better.",
    author: "Michael Okafor",
    handle: "mokafor",
    role: "Head of Risk",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
  },
  {
    content:
      "We connected our first targets and had digest alerts running the same day—onboarding was mostly configuration, not a services project.",
    author: "Priya Sharma",
    handle: "priyasharma",
    role: "CTO",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
  },
  {
    content:
      "Growth-tier real-time alerts plus Slack routing mean compliance sees changes without refreshing five regulator homepages.",
    author: "David Kim",
    handle: "davidkim",
    role: "VP of Compliance",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
  },
  {
    content:
      "Impact scoring and tags let analysts agree on what to escalate; exports and audit logs support how we document decisions.",
    author: "Maria Rodriguez",
    handle: "mariarod",
    role: "Regulatory Affairs Manager",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
  },
  {
    content:
      "Email digests for some owners, in-app for the core team—notification preferences match how we actually work.",
    author: "James Wilson",
    handle: "jameswilson",
    role: "Chief Compliance Officer",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
  },
];

/**
 * Comparison table: Regula column = shipped capabilities.
 * Other columns use "Varies" / partial where we do not verify vendor-by-vendor.
 */
export const comparisons = [
  {
    feature: "Published self-serve pricing",
    regula: "$39/mo Starter (listed in app)",
    regology: "Contact vendor",
    corlytics: "Contact vendor",
    gnowit: "Contact vendor",
  },
  {
    feature: "Free tier (try before buy)",
    regula: "3 targets, daily crawls, 30-day retention",
    regology: "Varies",
    corlytics: "Varies",
    gnowit: "Varies",
  },
  {
    feature: "Monitors sources you configure",
    regula: true,
    regology: "Varies",
    corlytics: "Varies",
    gnowit: "Varies",
  },
  {
    feature: "Alert workflow",
    regula: true,
    regology: "partial",
    corlytics: "partial",
    gnowit: "partial",
  },
  {
    feature: "Version history & side-by-side compare",
    regula: true,
    regology: "partial",
    corlytics: "partial",
    gnowit: "partial",
  },
  {
    feature: "In-product team collaboration",
    regula: true,
    regology: "partial",
    corlytics: "partial",
    gnowit: "partial",
  },
  {
    feature: "Audit logs, GDPR, retention controls",
    regula: true,
    regology: "partial",
    corlytics: "partial",
    gnowit: "partial",
  },
  {
    feature: "Crawl frequency (configurable by plan)",
    regula: "Daily–hourly (see plans)",
    regology: "Varies",
    corlytics: "Varies",
    gnowit: "Varies",
  },
  {
    feature: "LLM classification & impact scoring",
    regula: true,
    regology: "partial",
    corlytics: true,
    gnowit: "partial",
  },
  {
    feature: "In-app analytics",
    regula: true,
    regology: "Varies",
    corlytics: "Varies",
    gnowit: "Varies",
  },
  {
    feature: "Typical self-serve time-to-value",
    regula: "< 15 minutes to first targets",
    regology: "Varies",
    corlytics: "Varies",
    gnowit: "Varies",
  },
];
