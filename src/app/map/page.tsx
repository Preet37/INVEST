import { Shell } from "@/lib/shell";
import { getIdeaMap } from "@/lib/map";
import IdeaMap from "./IdeaMap";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Shell>
      <Load />
    </Shell>
  );
}

async function Load() {
  return <IdeaMap {...(await getIdeaMap())} />;
}
