export type NavItem = {
  href: string;
  label: string;
  icon: string;
  description: string;
  /** When true, the item is only highlighted on an exact path match. */
  exact?: boolean;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: "LayoutDashboard",
        description: "Everything at a glance",
      },
    ],
  },
  {
    title: "Commercial",
    items: [
      {
        href: "/commercial",
        label: "Commercial",
        icon: "Briefcase",
        description: "Leads, clients and pipeline",
      },
      {
        href: "/marketing",
        label: "Marketing",
        icon: "Megaphone",
        description: "Campaigns and channels",
      },
      {
        href: "/projects",
        label: "Projects",
        icon: "FolderKanban",
        description: "Active and delivered work",
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        href: "/finance",
        label: "Overview",
        icon: "Wallet",
        description: "Income, expenses and net profit",
        exact: true,
      },
      {
        href: "/finance/income",
        label: "Income",
        icon: "Banknote",
        description: "Payments and invoices",
      },
      {
        href: "/finance/expenses",
        label: "Expenses",
        icon: "Receipt",
        description: "Business and personal spending",
      },
      {
        href: "/finance/allocations",
        label: "Allocations",
        icon: "Scale",
        description: "Tax, tithe, savings and allowance",
      },
      {
        href: "/finance/savings",
        label: "Savings",
        icon: "PiggyBank",
        description: "Funds and emergency reserve",
      },
      {
        href: "/finance/allowance",
        label: "Allowance",
        icon: "Wallet",
        description: "30,000 ETB monthly discipline",
      },
      {
        href: "/finance/investments",
        label: "Investments",
        icon: "Coins",
        description: "Business investment decisions",
      },
      {
        href: "/finance/reports",
        label: "Reports",
        icon: "LineChart",
        description: "Weekly and monthly summaries",
      },
    ],
  },
  {
    title: "Performance",
    items: [
      {
        href: "/daily-work",
        label: "Daily Work",
        icon: "CalendarClock",
        description: "Work sessions and focus",
      },
      {
        href: "/tasks",
        label: "Tasks & Weekly Planning",
        icon: "ListChecks",
        description: "Tasks, priorities and weekly plan",
      },
      {
        href: "/weekly-reports",
        label: "Weekly Reports",
        icon: "FileText",
        description: "Accountability reporting",
      },
      {
        href: "/performance",
        label: "Performance Analysis",
        icon: "TrendingUp",
        description: "Monthly reviews and trends",
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        href: "/reminders",
        label: "Reminders",
        icon: "Bell",
        description: "Obligations and notifications",
      },
      {
        href: "/settings",
        label: "Settings",
        icon: "Settings",
        description: "Profile, currency and rules",
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);
