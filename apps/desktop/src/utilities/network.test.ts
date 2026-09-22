import { afterEach, describe, expect, it, vi } from "vitest";
import { dnsLookup, ipLookupFacts, myIpFacts } from "./network";

function fact(facts: Array<[string, string]>, name: string): string | undefined {
  return facts.find(([entry]) => entry === name)?.[1];
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("my IP", () => {
  it("asks ipify and reports the address", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ip: "203.0.113.7" }));
    vi.stubGlobal("fetch", fetchMock);

    const facts = await myIpFacts();

    expect(fetchMock.mock.calls[0]![0]).toBe("https://api.ipify.org?format=json");
    expect(fact(facts, "IP address")).toBe("203.0.113.7");
  });

  it("fails clearly when the service answers with an error status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, false, 503)));
    await expect(myIpFacts()).rejects.toThrow(/503/);
  });
});

describe("IP lookup", () => {
  it("reports city, country and network for a given address", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          ip: "8.8.8.8",
          city: "Mountain View",
          region: "California",
          country_name: "United States",
          postal: "94043",
          latitude: 37.4,
          longitude: -122.1,
          org: "GOOGLE",
        }),
      ),
    );

    const facts = await ipLookupFacts("8.8.8.8");

    expect(fact(facts, "City")).toBe("Mountain View, California");
    expect(fact(facts, "Country")).toBe("United States");
    expect(fact(facts, "Network operator")).toBe("GOOGLE");
  });

  it("looks up the caller's own address when none is typed", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ip: "203.0.113.7" }));
    vi.stubGlobal("fetch", fetchMock);

    await ipLookupFacts("");

    expect(fetchMock.mock.calls[0]![0]).toBe("https://ipapi.co//json/");
  });

  it("surfaces the service's own reason for a bad address", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: true, reason: "Invalid IP" })));
    await expect(ipLookupFacts("not-an-ip")).rejects.toThrow("Invalid IP");
  });
});

describe("DNS lookup", () => {
  it("lists every answer for the requested record type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        Status: 0,
        Answer: [{ name: "example.com.", type: 1, TTL: 300, data: "93.184.216.34" }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await dnsLookup("example.com", { type: "A" });

    expect(fetchMock.mock.calls[0]![0]).toContain("name=example.com&type=A");
    expect(result).toContain("93.184.216.34");
    expect(result).toContain("TTL 300s");
  });

  it("says plainly when a domain has no records of that type", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ Status: 0 })));
    const result = await dnsLookup("example.com", { type: "MX" });
    expect(result).toMatch(/No MX records/);
  });

  it("refuses an empty domain before making a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(dnsLookup("", {})).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
