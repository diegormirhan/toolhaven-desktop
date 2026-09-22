import { describe, expect, it } from "vitest";
import {
  cnpjTool,
  cpfTool,
  generateCep,
  generateCnpj,
  generateCpf,
  generateUuidBatch,
  isValidCnpj,
  isValidCpf,
} from "./generators";

describe("CPF", () => {
  it("recognises a well-known valid test number", () => {
    expect(isValidCpf("111.444.777-35")).toBe(true);
  });

  it("rejects a number with the last digit tampered", () => {
    expect(isValidCpf("111.444.777-36")).toBe(false);
  });

  it("rejects eleven repeated digits, which pass the checksum but are not issued", () => {
    expect(isValidCpf("111.111.111-11")).toBe(false);
  });

  it("generates numbers that validate against its own rule, every time", () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      expect(isValidCpf(generateCpf())).toBe(true);
    }
  });

  it("is formatted with the punctuation a Brazilian form expects", () => {
    expect(generateCpf()).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
  });

  it("validates through the tool entry point", () => {
    expect(cpfTool("111.444.777-35", { mode: "validate" })).toBe("Valid CPF");
    expect(cpfTool("111.444.777-99", { mode: "validate" })).toBe("Not a valid CPF");
  });
});

describe("CNPJ", () => {
  it("recognises a well-known valid test number", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
  });

  it("rejects a tampered check digit", () => {
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
  });

  it("generates numbers that validate against its own rule, every time", () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      expect(isValidCnpj(generateCnpj())).toBe(true);
    }
  });

  it("always generates the /0001 branch", () => {
    expect(generateCnpj()).toMatch(/^\d{2}\.\d{3}\.\d{3}\/0001-\d{2}$/);
  });

  it("validates through the tool entry point", () => {
    expect(cnpjTool("11.222.333/0001-81", { mode: "validate" })).toBe("Valid CNPJ");
  });
});

describe("CEP", () => {
  it("has the shape of a Brazilian postal code", () => {
    expect(generateCep()).toMatch(/^\d{5}-\d{3}$/);
  });
});

describe("UUID batches", () => {
  it("generates as many as asked for, each one unique", () => {
    const lines = generateUuidBatch("", { count: "5" }).split("\n");
    expect(lines).toHaveLength(5);
    expect(new Set(lines).size).toBe(5);
  });

  it("stays inside a sane maximum", () => {
    expect(generateUuidBatch("", { count: "10000" }).split("\n")).toHaveLength(100);
  });
});
