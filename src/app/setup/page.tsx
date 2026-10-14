import { redirect } from "next/navigation";
import { ownerCount } from "@/lib/auth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SetupForm } from "@/components/auth/SetupForm";

export const metadata = { title: "Set up owner account" };
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if ((await ownerCount()) > 0) redirect("/login");

  return (
    <AuthLayout
      title="Create the owner account"
      subtitle="This system is private and single-user. Create the owner account now; you can add more settings later."
    >
      <SetupForm />
    </AuthLayout>
  );
}
