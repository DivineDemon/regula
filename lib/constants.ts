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
    label: "Testimonials",
    href: "#testimonials",
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

export const comparisons = [
  {
    feature: "SMB Friendly Pricing",
    regula: true,
    regology: false,
    corlytics: false,
    gnowit: "partial",
  },
  {
    feature: "Emerging Market Coverage",
    regula: true,
    regology: false,
    corlytics: false,
    gnowit: false,
  },
  {
    feature: "Real-Time Crawling",
    regula: true,
    regology: true,
    corlytics: "partial",
    gnowit: true,
  },
  {
    feature: "AI Impact Scoring",
    regula: true,
    regology: "partial",
    corlytics: true,
    gnowit: "partial",
  },
  {
    feature: "Setup Time",
    regula: "< 15 mins",
    regology: "Weeks",
    corlytics: "Months",
    gnowit: "Days",
  },
];
