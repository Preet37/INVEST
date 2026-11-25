import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getUser } from "./user";
import { devBypass } from "./session";

// Wraps every signed-in screen. Sends him to onboarding until it's finished.
export async function Shell({ children }: { children: React.ReactNode }) {
  const u = await getUser();
  if (!u.onboarded) redirect("/onboarding");
  return (
    <AppShell lockMinutes={u.lockMinutes} bypass={devBypass()}>
      {children}
    </AppShell>
  );
}
