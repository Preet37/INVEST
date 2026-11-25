import { redirect } from "next/navigation";
import Onboarding from "@/components/Onboarding";
import { db, passkey } from "@/db";

export const dynamic = "force-dynamic";

// First-time setup only. Once a passkey exists this page refuses and sends you to log in.
export default async function Page() {
  const keys = await db().select({ id: passkey.id }).from(passkey).limit(1);
  if (keys.length) redirect("/login");
  return <Onboarding mode="setup" initial={{ draft: {}, dailyGoal: 5, nudgeTime: null }} />;
}
