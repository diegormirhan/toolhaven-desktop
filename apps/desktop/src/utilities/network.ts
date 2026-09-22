/**
 * The three tools in the whole "quick tools" set that reach the internet on
 * purpose — there is no offline way to know your public IP, resolve a domain
 * or place it on a map. Each one is exactly one request to one well-known,
 * key-free public endpoint, and the panel says so before it runs.
 */

import type { Options } from "./text";

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`The lookup failed (HTTP ${response.status}).`);
  return response.json();
}

// ── My IP ───────────────────────────────────────────────────────────────

export async function myIpFacts(): Promise<Array<[string, string]>> {
  const data = (await getJson("https://api.ipify.org?format=json")) as { ip?: string };
  if (!data.ip) throw new Error("The lookup returned no address.");
  return [["IP address", data.ip]];
}

// ── IP lookup ───────────────────────────────────────────────────────────

type IpApiResponse = {
  ip?: string;
  city?: string;
  region?: string;
  country_name?: string;
  postal?: string;
  latitude?: number;
  longitude?: number;
  org?: string;
  error?: boolean;
  reason?: string;
};

export async function ipLookupFacts(text: string): Promise<Array<[string, string]>> {
  const address = text.trim();
  const path = address ? encodeURIComponent(address) : "";
  const data = (await getJson(`https://ipapi.co/${path}/json/`)) as IpApiResponse;
  if (data.error) throw new Error(data.reason ?? "That address could not be located.");
  const facts: Array<[string, string]> = [];
  if (data.ip) facts.push(["IP address", data.ip]);
  if (data.city || data.region) facts.push(["City", [data.city, data.region].filter(Boolean).join(", ")]);
  if (data.country_name) facts.push(["Country", data.country_name]);
  if (data.postal) facts.push(["Postal code", data.postal]);
  if (data.latitude != null && data.longitude != null) {
    facts.push(["Coordinates", `${data.latitude}, ${data.longitude}`]);
  }
  if (data.org) facts.push(["Network operator", data.org]);
  return facts;
}

// ── DNS lookup ──────────────────────────────────────────────────────────

const RECORD_TYPES: Record<string, number> = {
  A: 1,
  AAAA: 28,
  CNAME: 5,
  MX: 15,
  TXT: 16,
  NS: 2,
  SOA: 6,
};

type DohAnswer = { name: string; type: number; TTL: number; data: string };
type DohResponse = { Status: number; Answer?: DohAnswer[] };

export async function dnsLookup(text: string, options: Options): Promise<string> {
  const domain = text.trim();
  if (!domain) throw new Error("Type a domain to look up.");
  const type = options.type ?? "A";
  const data = (await getJson(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`,
    { headers: { accept: "application/dns-json" } },
  )) as DohResponse;
  if (!data.Answer || data.Answer.length === 0) return `No ${type} records found for ${domain}.`;
  return data.Answer.map((answer) => `${answer.name}  ${type}  ${answer.data}  (TTL ${answer.TTL}s)`).join(
    "\n",
  );
}

export const dnsRecordTypes = Object.keys(RECORD_TYPES);
