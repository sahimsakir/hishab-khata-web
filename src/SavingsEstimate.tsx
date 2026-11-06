import { money } from "./money";
import type { Data, Transaction } from "./types";
import { growthMethods, projectSavings } from "./savings";

export function SavingsEstimate({ data, transactions, planId }: { data: Data; transactions?: readonly Transaction[]; planId?: string }) {
  if (data.type === "Goal") return null;
  const monthly = data.calculation_basis === "monthly_installments";
  const estimate = projectSavings(data, transactions, planId);
  if (!estimate) return <p className="sub">Enter a rate and valid dates to estimate returns. Monthly installments require a whole number of months.</p>;
  const sip = data.type === "SIP";
  return <section className="savings-estimate" aria-label="Estimated savings returns">
    <strong>{sip ? "Investment projection" : "Interest projection"}</strong>
    <dl>
      <div><dt>Annual {sip ? "expected return" : "interest"} rate</dt><dd>{estimate.annualRate}%</dd></div>
      <div><dt>Projected principal</dt><dd>{money(estimate.principal)}</dd></div>
      <div><dt>Estimated {sip ? "return" : "interest"}</dt><dd>{money(estimate.gain)}</dd></div>
      <div><dt>Estimated maturity value</dt><dd>{money(estimate.maturity)}</dd></div>
      <div><dt>Total return (not annual)</dt><dd>{estimate.returnPercent.toFixed(2)}%</dd></div>
      <div><dt>Scheduled deposits included</dt><dd>{estimate.contributions}</dd></div>
    </dl>
    {monthly ? <p className="sub">Full-term estimate from {String(data.opening_date)} to {String(data.maturity)}. Uses {estimate.contributions} equal monthly installments, a monthly rate of {Number(data.annual_rate) / 12}%, and {data.payment_timing === "end" ? "end" : "beginning"}-of-month payments. {data.type === "DPS" ? "Recorded installments are already part of the contract total; opening balance is not added again." : "Initial investment is included separately."} Before taxes and fees.</p> :
    <p className="sub">{growthMethods.find(([key]) => key === data.compounding)?.[1] ?? "Compound monthly"}. From {String(data.projection_start)} to {String(data.maturity)}. Actual days / 365; compound formulas use fractional periods. Before taxes and fees. {data.type === "FDR" ? "Uses the deposit amount as principal." : "Includes opening savings and recorded contributions before the projection date."} Scheduled payments are assumed to be made on time.</p>}
    <p className="sub">{sip ? "SIP returns are an assumption, not guaranteed interest; actual investments can lose value." : "Indicative estimate; your bank’s calculation and payout terms may differ."} Projections do not change your recorded balance.</p>
  </section>;
}
