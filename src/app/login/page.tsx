import { redirect } from "next/navigation";
import { ownerCount } from "@/lib/auth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if ((await ownerCount()) === 0) redirect("/setup");

  return (
    <AuthLayout
      title="Sign in to AddisDR ERP"
      subtitle="Private business and financial information."
    >
      <LoginForm />
    </AuthLayout>
  );
}
