import { describe, expect, it } from "vitest";
import { recordFields } from "./forms";
import { recordDraft, normalizeSavings, changeRecordField } from "./recordDraft";
import { projectSavings } from "./savings";
import { calculateMaturity } from "./maturity";

describe("conditional forms and bank-style DPS", () => {
  const fields=(type:string)=>recordFields("savings",[],{type,calculation_basis:"monthly_installments",maturity_mode:"duration"});
  it("matches the provided bank maturity and keeps opening date independent of payment day", () => {
    const data=normalizeSavings({type:"DPS",opening:"40000",opening_date:"2026-07-07",first_payment:"2026-07-07",day:"8",monthly:"10000",annual_rate:"9",maturity_mode:"duration",term_value:"3",term_unit:"years",calculation_basis:"monthly_installments",payment_timing:"beginning"});
    expect(data.maturity).toBe("2029-07-07");
    expect(projectSavings(data)).toMatchObject({principal:36000000,gain:5461361,maturity:41461361,contributions:36});
    expect(calculateMaturity({...data,day:15})).toBe("2029-07-07");
  });
  it("handles zero rates and end-of-month installments", () => {
    const data=normalizeSavings({type:"DPS",opening:"0",opening_date:"2026-07-07",first_payment:"2026-07-07",day:"8",monthly:"10000",annual_rate:"0",maturity_mode:"duration",term_value:"3",term_unit:"years",calculation_basis:"monthly_installments",payment_timing:"beginning"});
    expect(projectSavings(data)?.maturity).toBe(36000000);
    expect(projectSavings({...data,annual_rate:9,payment_timing:"end"})?.maturity).toBe(41152716);
  });
  it("shows only fixed-deposit inputs for FDR", () => {
    const names=fields("FDR").map(f=>f.name);
    expect(names).toContain("target");expect(names).toContain("opening_date");
    for(const name of ["monthly","day","first_payment","payment_timing","calculation_basis"])expect(names).not.toContain(name);
  });
  it("uses investment labels for SIP and hides interest fields for a savings goal", () => {
    expect(fields("SIP").find(f=>f.name==="annual_rate")?.label).toBe("Expected annual return (%)");
    expect(fields("Goal").map(f=>f.name)).not.toContain("annual_rate");
    expect(fields("Goal").map(f=>f.name)).not.toContain("bank");
  });
  it("changes income details and removes monthly schedule for one-time receipts", () => {
    const salary=recordFields("incomes",[],{type:"Salary"});
    expect(salary.find(f=>f.name==="payer")?.label).toBe("Employer");
    const once=recordFields("incomes",[],{type:"Freelance",frequency:"once"});
    expect(once.map(f=>f.name)).toContain("payment_date");expect(once.map(f=>f.name)).not.toContain("day");
    expect(once.find(f=>f.name==="payer")?.label).toBe("Client");
  });
  it("hides bank details for cash and rates for interest-free personal loans", () => {
    expect(recordFields("accounts",[],{type:"Cash"}).map(f=>f.name)).not.toContain("institution");
    expect(recordFields("accounts",[],{type:"Bank"}).map(f=>f.name)).toContain("institution");
    expect(recordFields("loans",[],{type:"Family / friend",interest_bearing:"no"}).map(f=>f.name)).not.toContain("rate");
  });
  it("normalizes new drafts and investment type changes without exposing irrelevant inputs", () => {
    const initial=recordDraft("savings",[]);
    expect(initial.calculation_basis).toBe("monthly_installments");
    const fdr=changeRecordField("savings",[],initial,"type","FDR");
    expect(fdr.monthly).toBe("0");expect(fdr.calculation_basis).toBe("actual_days");
  });
  it("uses standard labels without combined investment names", () => {
    for(const type of ["DPS","FDR","SIP","Goal"])for(const f of fields(type))expect(f.label).not.toMatch(/\/|expected SIP|for DPS|for FDR/);
  });
});
