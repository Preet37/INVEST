import { redirect } from "next/navigation";
import Onboarding from "@/components/Onboarding";
import { getUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const u = await getUser();
  const edit = (await searchParams).edit === "1";
  if (u.onboarded && !edit) redirect("/");
  return (
    <Onboarding
      mode={u.onboarded ? "edit" : "onboarding"}
      initial={{ draft: u.onboardingDraft, dailyGoal: u.dailyGoal, nudgeTime: u.nudgeTime }}
    />
  );
}
