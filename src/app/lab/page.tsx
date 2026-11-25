import { Shell } from "@/lib/shell";
import { currentCharts } from "@/lib/market";
import { readChart } from "@/lib/patterns";
import Lab from "./Lab";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Shell>
      <Load />
    </Shell>
  );
}

async function Load() {
  const { charts, missing } = await currentCharts();
  return <Lab current={charts.map((c) => ({ ...c, facts: readChart(c.bars) }))} missing={missing} />;
}
