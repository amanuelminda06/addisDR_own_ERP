export default function AppLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-64 rounded bg-slate-200" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-40 rounded-xl bg-slate-200 lg:col-span-2" />
        <div className="h-40 rounded-xl bg-slate-200" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-40 rounded-xl bg-slate-200" />
        <div className="h-40 rounded-xl bg-slate-200 lg:col-span-2" />
      </div>
    </div>
  );
}
