import { redirect } from "next/navigation";
import { getCurrentUser, ownerCount } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if ((await ownerCount()) === 0) redirect("/setup");
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={{ name: user.name, username: user.username }}>
      {children}
    </AppShell>
  );
}
