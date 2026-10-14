import { requireUser } from "@/lib/auth";
import { toNumber } from "@/lib/utils";
import { APP_TIMEZONE, DEFAULT_CURRENCY, PLANNED_HOURS_PER_DAY, PLANNED_HOURS_PER_WEEK, SESSIONS_PER_WORKDAY } from "@/lib/constants";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { PasswordForm } from "@/components/settings/PasswordForm";
import { Icon } from "@/components/icons";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Profile, currency, allowance and the operating rules this system is built around."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Profile & financial rules" />
          <CardBody>
            <ProfileForm
              user={{
                name: user.name,
                username: user.username,
                email: user.email,
                timezone: user.timezone,
                currency: user.currency,
                monthlyAllowance: String(toNumber(user.monthlyAllowance)),
                accountabilityPartnerName: user.accountabilityPartnerName,
                accountabilityPartnerEmail: user.accountabilityPartnerEmail,
              }}
            />
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Change password" />
            <CardBody>
              <PasswordForm />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="System" />
            <CardBody className="space-y-2 text-sm text-slate-600">
              <Row label="App timezone" value={APP_TIMEZONE} />
              <Row label="Default currency" value={DEFAULT_CURRENCY} />
              <Row label="Work sessions / day" value={String(SESSIONS_PER_WORKDAY)} />
              <Row label="Planned hours / day" value={`${PLANNED_HOURS_PER_DAY} h`} />
              <Row label="Planned hours / week" value={`${PLANNED_HOURS_PER_WEEK} h`} />
            </CardBody>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Operating rules"
          subtitle="Reference summary — enforced in full during later phases."
        />
        <CardBody>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <RuleBlock
              title="Work schedule"
              items={[
                "3 sessions per workday, 9 planned hours",
                "2 daytime sessions + 1 nighttime session",
                "Workdays Monday–Friday",
                "Saturday: refreshment, catch-up, weekly report",
                "Sunday: rest and religious day",
              ]}
            />
            <RuleBlock
              title="Planning & accountability"
              items={[
                "Plan/review the coming week every Saturday",
                "Accountability partner receives the weekly report",
                "Unfinished required work is rescheduled, not discarded",
                "Planned leave compensated in advance where possible",
                "Reminders for missing plans, reports and overdue items",
              ]}
            />
            <RuleBlock
              title="Financial discipline"
              items={[
                "Target personal allowance: 30,000 ETB / month",
                "Tax, business expenses and tithe accounted first",
                "Surplus directed to savings and investment",
                "Emergency savings for medical / critical family needs",
                "Business investments planned and justified",
              ]}
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}

function RuleBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Icon name="ClipboardList" className="h-4 w-4 text-brand-500" />
        {title}
      </h3>
      <ul className="mt-2 space-y-1.5 text-xs text-slate-500">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
