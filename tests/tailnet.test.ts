import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTailscaleStatus, tailnetEnv } from "../src/lib/tailnet";

const INVALID = { message: "tailscale status: invalid JSON" };
const NO_DNS = { message: "tailscale status: no DNS name (is MagicDNS on?)" };
const status = (self: unknown, state = "Running") => JSON.stringify({ BackendState: state, Self: self });

test("strips the trailing dot and lowercases the host", () => {
  assert.deepEqual(parseTailscaleStatus(status({ DNSName: "Mac.Tail1234.TS.NET." })), { host: "mac.tail1234.ts.net", running: true });
  assert.equal(parseTailscaleStatus(status({ DNSName: "mac.tail1234.ts.net" })).host, "mac.tail1234.ts.net");
});

test("running is true only when BackendState is Running", () => {
  assert.equal(parseTailscaleStatus(status({ DNSName: "mac.tail1234.ts.net." }, "Running")).running, true);
  assert.equal(parseTailscaleStatus(status({ DNSName: "mac.tail1234.ts.net." }, "Stopped")).running, false);
  assert.equal(parseTailscaleStatus(status({ DNSName: "mac.tail1234.ts.net." }, "NeedsLogin")).running, false);
  assert.equal(parseTailscaleStatus(JSON.stringify({ Self: { DNSName: "mac.tail1234.ts.net." } })).running, false);
});

test("bad JSON gives the exact invalid-JSON message", () => {
  assert.throws(() => parseTailscaleStatus("{"), INVALID);
  assert.throws(() => parseTailscaleStatus(""), INVALID);
  assert.throws(() => parseTailscaleStatus("not json"), INVALID);
});

test("valid JSON that is not an object has no DNS name", () => {
  for (const raw of ["null", "[]", "42", "\"mac.ts.net\"", "true"]) assert.throws(() => parseTailscaleStatus(raw), NO_DNS, raw);
});

test("missing Self has no DNS name", () => {
  assert.throws(() => parseTailscaleStatus(JSON.stringify({ BackendState: "Running" })), NO_DNS);
  assert.throws(() => parseTailscaleStatus(status(null)), NO_DNS);
});

test("DNSName missing, empty, or not a string has no DNS name", () => {
  assert.throws(() => parseTailscaleStatus(status({})), NO_DNS);
  assert.throws(() => parseTailscaleStatus(status({ DNSName: "" })), NO_DNS);
  assert.throws(() => parseTailscaleStatus(status({ DNSName: "." })), NO_DNS);
  assert.throws(() => parseTailscaleStatus(status({ DNSName: ".." })), NO_DNS);
  assert.throws(() => parseTailscaleStatus(status({ DNSName: "   " })), NO_DNS);
  assert.throws(() => parseTailscaleStatus(status({ DNSName: 42 })), NO_DNS);
});

test("tailnetEnv gives RP_ID and an https RP_ORIGIN", () => {
  assert.deepEqual(tailnetEnv("mac.tail1234.ts.net"), { RP_ID: "mac.tail1234.ts.net", RP_ORIGIN: "https://mac.tail1234.ts.net" });
});
