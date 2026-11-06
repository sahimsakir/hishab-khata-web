import { describe, expect, it } from "vitest";
import { eligibleInstallments } from "./installmentHistory";
const dps={type:"DPS",start:"2026-07",first_payment:"2026-07-08",opening_date:"2026-07-07",day:8,maturity:"2029-07-07",calculation_basis:"monthly_installments",maturity_mode:"duration",installment_count:36};
describe("opening installment history eligibility",()=>{
  it("allows four installments before the November due date",()=>{
    const dates=eligibleInstallments("savings",dps,"2026-11-06");
    expect(dates.map(d=>d.cycle)).toEqual(["2026-07","2026-08","2026-09","2026-10"]);
    expect(eligibleInstallments("savings",dps,"2026-11-08")).toHaveLength(5);
  });
  it("handles future plans, month ends, and completed terms",()=>{
    expect(eligibleInstallments("savings",dps,"2026-06-30")).toHaveLength(0);
    expect(eligibleInstallments("savings",dps,"2031-01-01")).toHaveLength(36);
    expect(eligibleInstallments("loans",{start:"2026-01",day:31,term:12},"2026-02-28")).toHaveLength(2);
  });
  it("does not offer installment history for fixed deposits or income",()=>{
    expect(eligibleInstallments("savings",{...dps,type:"FDR"},"2026-11-06")).toEqual([]);
    expect(eligibleInstallments("incomes",dps,"2026-11-06")).toEqual([]);
  });
});
