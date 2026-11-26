// npm run tailnet: serve the dev server over HTTPS on this machine's Tailscale MagicDNS name.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { parseTailscaleStatus, tailnetEnv } from "../src/lib/tailnet";

const MAC_CLI = "/Applications/Tailscale.app/Contents/MacOS/Tailscale";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function findCli(): string | null {
  try {
    execFileSync("tailscale", ["version"], { stdio: "ignore" });
    return "tailscale";
  } catch {
    return existsSync(MAC_CLI) ? MAC_CLI : null;
  }
}

const cli = findCli();
if (!cli) fail("Tailscale CLI not found. Install Tailscale and run: tailscale up");

let raw: string;
try {
  raw = execFileSync(cli, ["status", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch {
  // The CLI exits non-zero when the Tailscale daemon is not running.
  fail("Tailscale is not connected. Run: tailscale up");
}

let status: { host: string; running: boolean };
try {
  status = parseTailscaleStatus(raw);
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}

if (!status.running) fail("Tailscale is not connected. Run: tailscale up");

const port = process.env.PORT || "3000";
if (!/^\d+$/.test(port)) fail(`PORT must be a number, got: ${port}`);

try {
  execFileSync(cli, ["serve", "--bg", port], { stdio: "inherit" });
} catch {
  fail(`tailscale serve --bg ${port} failed. Check that HTTPS certificates are on in the Tailscale admin console.`);
}

const env = tailnetEnv(status.host);
console.log(`Serving http://localhost:${port} at ${env.RP_ORIGIN}`);
console.log("Add to .env.local:");
console.log(`RP_ID=${env.RP_ID}`);
console.log(`RP_ORIGIN=${env.RP_ORIGIN}`);
// next dev reads PORT from the shell, not from .env.local, so pass it on the command line.
console.log(port === "3000" ? "Then run: npm run dev" : `Then run: PORT=${port} npm run dev`);
process.exit(0);
