import { redirect } from "next/navigation";
import { db, passkey } from "@/db";
import Login from "./Login";

export const dynamic = "force-dynamic";

export default async function Page() {
  const keys = await db().select({ id: passkey.id }).from(passkey).limit(1);
  if (!keys.length) redirect("/setup");
  return <Login />;
}
