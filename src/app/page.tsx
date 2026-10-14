import { redirect } from "next/navigation";
import { ownerCount } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  if ((await ownerCount()) === 0) redirect("/setup");
  redirect("/dashboard");
}
