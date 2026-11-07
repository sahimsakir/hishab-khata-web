import { expect, it } from "vitest";
import { loanEstimate } from "./LoanCalculator";

it("calculates reducing-balance EMI and adds the fee to outlay", () => {
  expect(loanEstimate(100000000, 12, 60, 500000)).toEqual({
    emi: 2224445, interest: 33466686, repayment: 133466686, total: 133966686,
  });
});

it("handles an interest-free loan", () => {
  expect(loanEstimate(100000, 0, 3, 0)).toEqual({
    emi: 33333, interest: 0, repayment: 100000, total: 100000,
  });
});
