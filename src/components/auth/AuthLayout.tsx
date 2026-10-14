import { Icon } from "@/components/icons";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            A
          </span>
          <div className="leading-tight">
            <p className="text-base font-semibold text-slate-800">AddisDR ERP</p>
            <p className="text-xs text-slate-500">Personal management system</p>
          </div>
        </div>

        <div className="card p-6">
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          ) : null}
          <div className="mt-5">{children}</div>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Icon name="CircleAlert" className="h-3.5 w-3.5" />
          Single-user system · not indexed · data stays in your database
        </p>
      </div>
    </div>
  );
}
