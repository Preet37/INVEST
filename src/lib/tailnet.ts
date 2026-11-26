// Pure helpers for serving the app over Tailscale. No I/O here, so they are easy to test.

const NO_DNS = "tailscale status: no DNS name (is MagicDNS on?)";

export function parseTailscaleStatus(raw: string): { host: string; running: boolean } {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("tailscale status: invalid JSON");
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) throw new Error(NO_DNS);
  const status = data as { Self?: unknown; BackendState?: unknown };
  const self = status.Self;
  if (typeof self !== "object" || self === null) throw new Error(NO_DNS);
  const dnsName = (self as { DNSName?: unknown }).DNSName;
  if (typeof dnsName !== "string") throw new Error(NO_DNS);
  const host = dnsName.trim().replace(/\.+$/, "").toLowerCase();
  if (!host) throw new Error(NO_DNS);
  return { host, running: status.BackendState === "Running" };
}

export function tailnetEnv(host: string): { RP_ID: string; RP_ORIGIN: string } {
  return { RP_ID: host, RP_ORIGIN: "https://" + host };
}
