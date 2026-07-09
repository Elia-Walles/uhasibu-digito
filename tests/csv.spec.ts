import { describe, it, expect } from "vitest";
import { toCsv, parseCsv } from "@/lib/utils/csv";

describe("CSV round-trip", () => {
  it("quotes fields containing commas, quotes and newlines", () => {
    const csv = toCsv(["a", "b"], [[1, "x,y"], [2, 'q"z']]);
    expect(csv).toBe('a,b\r\n1,"x,y"\r\n2,"q""z"');
  });

  it("parses back the same cells", () => {
    const csv = toCsv(["date", "amount"], [["2026-01-05", 1500], ["2026-01-06", -200]]);
    const rows = parseCsv(csv);
    expect(rows[0]).toEqual(["date", "amount"]);
    expect(rows[1]).toEqual(["2026-01-05", "1500"]);
    expect(rows[2]).toEqual(["2026-01-06", "-200"]);
  });

  it("handles escaped quotes and skips blank lines", () => {
    const rows = parseCsv('name,note\r\n"Acme, Ltd","say ""hi"""\r\n\r\n');
    expect(rows).toEqual([["name", "note"], ["Acme, Ltd", 'say "hi"']]);
  });
});
