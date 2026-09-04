import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function AuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || (session.role !== "ADMIN" && session.role !== "FINANCE_OWNER")) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
