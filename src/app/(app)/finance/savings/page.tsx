import { toNumber } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/datetime";
import { getSavingsWithTotal } from "@/lib/finance-queries";
import { SAVINGS_FUND_LABELS, SAVINGS_TRANSACTION_LABELS } from "@/lib/labels";
import { SAVINGS_FUNDS } from "@/lib/validation";
import { deleteSavingsTransactionAction } from "@/lib/actions/finance";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  SavingsAccountForm,
  SavingsTransactionForm,
} from "@/components/finance/SavingsForms";
import { ConfirmDeleteButton } from "@/components/finance/ConfirmDeleteButton";

export const metadata = { title: "Savings" };
export const dynamic = "force-dynamic";

export default async function SavingsPage() {
  const user = await requireUser();
  const { accounts, transactions, balances, total } = await getSavingsWithTotal();

  const accountByFund = new Map(accounts.map((a) => [a.fund, a]));
  const accountById = new Map(accounts.map((a) => [a.id, a.fund]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Savings"
        description="Reserved funds for startup capital, long-term investment and emergencies."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SAVINGS_FUNDS.map((fund) => (
          <StatCard key={fund} label={SAVINGS_FUND_LABELS[fund]} value={formatCurrency(balances[fund] ?? 0, user.currency)} />
        ))}
      </div>

      <StatCard
        label="Total savings"
        value={formatCurrency(total, user.currency)}
        tone="brand"
      />

      <Card>
        <CardHeader title="Record a transaction" subtitle="Contributions add to a fund; withdrawals reduce it." />
        <CardBody>
          <SavingsTransactionForm />
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {SAVINGS_FUNDS.map((fund) => {
          const account = accountByFund.get(fund);
          const fundTx = transactions.filter(
            (t) => accountById.get(t.fundId) === fund,
          );
          return (
            <Card key={fund}>
              <CardHeader
                title={SAVINGS_FUND_LABELS[fund]}
                subtitle={`Balance ${formatCurrency(balances[fund] ?? 0, user.currency)}`}
                action={
                  <Badge tone={fund === "EMERGENCY" ? "warning" : "brand"}>
                    {SAVINGS_FUND_LABELS[fund]}
                  </Badge>
                }
              />
              <CardBody className="space-y-4">
                {account ? (
                  <SavingsAccountForm
                    fund={fund}
                    name={account.name}
                    openingBalance={toNumber(account.openingBalance).toFixed(2)}
                  />
                ) : (
                  <p className="text-sm text-slate-500">No account configured for this fund.</p>
                )}
                {fundTx.length === 0 ? (
                  <EmptyState title="No transactions yet" />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {fundTx.slice(0, 8).map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-slate-700">
                            {SAVINGS_TRANSACTION_LABELS[t.type as "CONTRIBUTION" | "WITHDRAWAL"]}
                            {t.reason ? ` · ${t.reason}` : ""}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatDate(t.occurredAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={
                              t.type === "CONTRIBUTION"
                                ? "text-sm tabular-nums text-emerald-700"
                                : "text-sm tabular-nums text-red-600"
                            }
                          >
                            {t.type === "CONTRIBUTION" ? "+" : "−"}
                            {formatCurrency(toNumber(t.amount))}
                          </span>
                          <ConfirmDeleteButton
                            id={t.id}
                            action={deleteSavingsTransactionAction}
                            message="Delete this savings transaction?"
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
