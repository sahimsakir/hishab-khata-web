import { describe, expect, it } from "vitest";
import { calculateMaturity, updateMaturity } from "./maturity";
import { projectSavings } from "./savings";
const plan = { start: "2026-07", day: "8", term_value: "3", term_unit: "years", maturity_mode: "duration" };
describe("savings duration", () => {
  it("adds years and equivalent months", () => {
    expect(calculateMaturity(plan)).toBe("2029-07-08");
    expect(calculateMaturity({...plan,term_value:"36",term_unit:"months"})).toBe("2029-07-08");
  });
  it("clamps month ends and leap days", () => {
    expect(calculateMaturity({...plan,start:"2026-01",day:"31",term_value:"1",term_unit:"months"})).toBe("2026-02-28");
    expect(calculateMaturity({...plan,start:"2028-02",day:"29",term_value:"1"})).toBe("2029-02-28");
  });
  it("preserves exact dates, including older plans", () => {
    expect(updateMaturity({...plan,maturity_mode:"exact",maturity:"2029-08-15"}).maturity).toBe("2029-08-15");
  });
  it("rejects fractions, zero, and excessive terms", () => {
    for(const term_value of ["0","1.5","101"]) expect(calculateMaturity({...plan,term_value})).toBeNull();
  });
  it("schedules 36 deposits for a three-year plan without an extra maturity-day installment", () => {
    const data=updateMaturity({...plan,type:"DPS",opening:"0",monthly:"10000",annual_rate:"0",compounding:"monthly",projection_start:"2026-07-08"});
    expect(projectSavings(data)).toMatchObject({contributions:36,principal:36000000,maturity:36000000});
  });
});
