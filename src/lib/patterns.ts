// Plain-language chart reading. Everything here is computed from the prices, so nothing is made up.

export type Bar = { day: string; open: number; high: number; low: number; close: number; volume: number };
export type Fact = { name: string; text: string };

const pct = (x: number) => `${Math.abs(x * 100).toFixed(x * 100 >= 10 || x * 100 <= -10 ? 0 : 1)}%`;
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

// Straight-line fit through the closes: how far the "average path" moved across the window.
export function trendChange(bars: Bar[]) {
  const n = bars.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2;
  const my = avg(bars.map((b) => b.close));
  let num = 0;
  let den = 0;
  bars.forEach((b, i) => {
    num += (i - mx) * (b.close - my);
    den += (i - mx) ** 2;
  });
  const slope = num / den;
  const start = my - slope * mx;
  return start > 0 ? (slope * (n - 1)) / start : 0;
}

export function trendOf(bars: Bar[]): "up" | "down" | "sideways" {
  const c = trendChange(bars);
  return c > 0.08 ? "up" : c < -0.08 ? "down" : "sideways";
}

// How many separate times the price came close to a level (visits at least 5 days apart).
function touches(bars: Bar[], level: number, pick: (b: Bar) => number) {
  let count = 0;
  let last = -10;
  bars.forEach((b, i) => {
    if (Math.abs(pick(b) - level) / level <= 0.02 && i - last >= 5) {
      count++;
      last = i;
    }
  });
  return count;
}

export function readChart(bars: Bar[]): Fact[] {
  if (bars.length < 30) return [];
  const facts: Fact[] = [];
  const last = bars[bars.length - 1];
  const change = trendChange(bars);
  const trend = trendOf(bars);
  facts.push({
    name: "Trend",
    text:
      trend === "up"
        ? `The overall direction is up. Across this window the price climbed about ${pct(change)}, in a zigzag of higher peaks and higher dips.`
        : trend === "down"
          ? `The overall direction is down. Across this window the price slid about ${pct(change)}, with lower peaks and lower dips.`
          : `There is no clear direction. The price ends about where a straight line through it started (${pct(change)} ${change >= 0 ? "up" : "down"}), so this is a sideways market.`,
  });

  const high = Math.max(...bars.map((b) => b.high));
  const low = Math.min(...bars.map((b) => b.low));
  const floorTouches = touches(bars, low, (b) => b.low);
  const ceilTouches = touches(bars, high, (b) => b.high);
  if ((high - last.close) / high <= 0.03) {
    facts.push({
      name: "Resistance (a ceiling)",
      text: `The price is right up against its highest level in this window (around ${high.toFixed(2)})${ceilTouches > 1 ? `, a level it has reached ${ceilTouches} separate times` : ""}. Sellers have shown up here before. Breaking clearly above it would be a sign of strength.`,
    });
  } else if ((last.close - low) / low <= 0.03) {
    facts.push({
      name: "Support (a floor)",
      text: `The price is sitting near its lowest level in this window (around ${low.toFixed(2)})${floorTouches > 1 ? `, a level it has bounced from ${floorTouches} separate times` : ""}. Buyers have stepped in here before. Falling clearly below it would be a sign of weakness.`,
    });
  } else if (trend === "sideways" && (floorTouches >= 2 || ceilTouches >= 2)) {
    facts.push({
      name: "Support and resistance",
      text:
        `The price has been moving between a floor near ${low.toFixed(2)} and a ceiling near ${high.toFixed(2)}.` +
        (floorTouches >= 2 ? ` It bounced off the floor ${floorTouches} times.` : "") +
        (ceilTouches >= 2 ? ` It was turned back at the ceiling ${ceilTouches} times.` : ""),
    });
  } else if (ceilTouches >= 2) {
    facts.push({
      name: "Resistance (a ceiling)",
      text: `The price was turned back ${ceilTouches} separate times near ${high.toFixed(2)}. Sellers keep showing up at that level, so it is the one to watch on the way back up.`,
    });
  } else if (floorTouches >= 2) {
    facts.push({
      name: "Support (a floor)",
      text: `The price bounced ${floorTouches} separate times near ${low.toFixed(2)}. Buyers keep stepping in at that level, so it is the one to watch on the way back down.`,
    });
  }

  const recentVol = avg(bars.slice(-10).map((b) => b.volume));
  const baseVol = avg(bars.slice(-60, -10).map((b) => b.volume));
  if (baseVol > 0) {
    const r = recentVol / baseVol;
    if (r >= 1.3) {
      facts.push({ name: "Volume", text: `Trading has been heavier than usual lately (about ${r.toFixed(1)} times the earlier average). Volume is how many shares change hands. Heavy volume means a lot of people care about this move.` });
    } else if (r <= 0.7) {
      facts.push({ name: "Volume", text: `Trading has been quieter than usual lately (about ${pct(1 - r)} below the earlier average). Volume is how many shares change hands. Moves on thin volume have fewer people behind them.` });
    }
  }

  let big: { day: string; move: number } | null = null;
  for (let i = Math.max(1, bars.length - 30); i < bars.length; i++) {
    const move = bars[i].close / bars[i - 1].close - 1;
    if (Math.abs(move) >= 0.05 && (!big || Math.abs(move) > Math.abs(big.move))) big = { day: bars[i].day, move };
  }
  if (big) {
    facts.push({
      name: "A big one-day move",
      text: `In the last 30 trading days there was a single day where the price ${big.move > 0 ? "jumped" : "dropped"} ${pct(big.move)}. Moves that size usually follow news, such as company results. This app has no news feed, so look up what happened that day.`,
    });
  }
  return facts;
}

export type Outcome = "up" | "flat" | "down";
export const OUTCOME_THRESHOLD = 0.04;
export function outcomeOf(change: number): Outcome {
  return change > OUTCOME_THRESHOLD ? "up" : change < -OUTCOME_THRESHOLD ? "down" : "flat";
}

// What happened after the cut-off, and how it lines up with what the chart showed before.
export function explainOutcome(shown: Bar[], after: Bar[]) {
  const change = after[after.length - 1].close / shown[shown.length - 1].close - 1;
  const outcome = outcomeOf(change);
  const trend = trendOf(shown);
  const what =
    outcome === "up" ? `it climbed ${pct(change)}` : outcome === "down" ? `it dropped ${pct(change)}` : `it went roughly sideways (${pct(change)} ${change >= 0 ? "up" : "down"})`;
  const continued = (trend === "up" && outcome === "up") || (trend === "down" && outcome === "down") || (trend === "sideways" && outcome === "flat");
  const lesson = continued
    ? `The trend before the cut-off was ${trend}, and it carried on. Trends continue more often than they reverse, which is why chart readers start with the trend.`
    : `The trend before the cut-off was ${trend}, but that is not what came next. This is the honest part of chart reading: patterns tilt the odds, they never guarantee anything.`;
  return { change, outcome, summary: `Over the next ${after.length} trading days ${what}. ${lesson}` };
}
