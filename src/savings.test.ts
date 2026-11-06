import { describe, it, expect } from "vitest";
import { projectSavings } from "./savings";
import type { Transaction } from "./types";
const fdr = { type: "FDR", target: "100000", opening: "100000", monthly: "0", annual_rate: "8", compounding: "simple", projection_start: "2026-01-01", start: "2026-01", day: "1", maturity: "2027-01-01" };
describe("savings projections", () => {
  it("includes historic deposits and withdrawals without counting the schedule twice", () => {
    const tx = [{saving_id:"plan",type:"saving",date:"2026-01-08",amount_paisa:50000}, {saving_id:"plan",type:"savings_withdrawal",date:"2026-01-09",amount_paisa:10000}] as Transaction[];
    expect(projectSavings({...fdr,type:"DPS",annual_rate:"0",opening:"1000",monthly:"0",projection_start:"2026-02-01"},tx,"plan")?.principal).toBe(140000);
  });
  it("calculates one-year FDR simple interest without double counting opening funds", () => {
    expect(projectSavings(fdr)).toMatchObject({ principal: 10000000, gain: 800000, maturity: 10800000, returnPercent: 8, contributions: 0 });
  });
  it("compounds an FDR quarterly with only final paisa rounding", () => {
    expect(projectSavings({ ...fdr, compounding: "quarterly" })?.maturity).toBe(Math.round(10000000 * 1.02 ** 4));
  });
  it("counts only scheduled deposits on/after projection start and on/before maturity", () => {
    const dps = projectSavings({ ...fdr, type: "DPS", opening: "10000", monthly: "1000", annual_rate: "0", projection_start: "2026-02-01", day: "8", maturity: "2026-04-07" });
    expect(dps).toMatchObject({ principal: 1200000, maturity: 1200000, gain: 0, contributions: 2 });
  });
  it("clamps due day 31 in February and includes maturity-day deposits", () => {
    expect(projectSavings({ ...fdr, type: "DPS", opening: "0", monthly: "1000", annual_rate: "0", projection_start: "2026-02-01", day: "31", maturity: "2026-02-28" })).toMatchObject({ contributions: 1, maturity: 100000 });
  });
  it("grows each DPS installment for only its remaining time", () => {
    const p = projectSavings({ ...fdr, type: "DPS", opening: "0", monthly: "1000", annual_rate: "12", start: "2026-12", projection_start: "2026-12-01", maturity: "2027-01-01" });
    expect(p?.contributions).toBe(2);
    expect(p?.gain).toBe(Math.round(100000 * .12 * 31 / 365));
  });
  it("allows negative SIP scenarios without changing recorded amounts", () => {
    expect(projectSavings({ ...fdr, type: "SIP", annual_rate: "-10", compounding: "yearly" })).toMatchObject({ gain: -1000000, maturity: 9000000 });
    expect(fdr.opening).toBe("100000");
  });
  it("does not invent rates for older plans or accept invalid ranges", () => {
    for (const data of [{...fdr, annual_rate: ""}, {...fdr, annual_rate: "-5"}, {...fdr, annual_rate: "101"}, {...fdr, maturity: "2025-12-01"}, {...fdr, monthly: "100"}]) expect(projectSavings(data)).toBeNull();
  });
});
