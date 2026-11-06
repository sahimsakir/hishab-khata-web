import { money } from "./money";
import type { Data, Transaction } from "./types";
import { growthMethods, projectSavings } from "./savings";

export function SavingsEstimate({ data, transactions, planId }: { data: Data; transactions?: readonly Transaction[]; planId?: string }) {
  const estimate = projectSavings(data, transactions, planId);
  if (!estimate) return <p className="sub">Enter an annual rate, projection start date, and valid plan details to estimate returns.</p>;
  const sip = data.type === "SIP";
  return <section className="savings-estimate" aria-label="Estimated savings returns">
    <strong>{sip ? "Investment projection" : "Interest projection"}</strong>
    <dl>
      <div><dt>Annual {sip ? "expected return" : "interest"} rate</dt><dd>{estimate.annualRate}%</dd></div>
      <div><dt>Projected principal</dt><dd>{money(estimate.principal)}</dd></div>
      <div><dt>Estimated {sip ? "gain / loss" : "interest"}</dt><dd>{money(estimate.gain)}</dd></div>
      <div><dt>Estimated maturity value</dt><dd>{money(estimate.maturity)}</dd></div>
      <div><dt>Total return (not annual)</dt><dd>{estimate.returnPercent.toFixed(2)}%</dd></div>
      <div><dt>Scheduled deposits included</dt><dd>{estimate.contributions}</dd></div>
    </dl>
    <p className="sub">{growthMethods.find(([key]) => key === data.compounding)?.[1] ?? "Compound monthly"}. From {String(data.projection_start)} to {String(data.maturity)}. Actual days / 365; compound formulas use fractional periods. Before taxes and fees. {data.type === "FDR" ? "Uses target/principal as the planned lump sum." : "Includes opening savings and recorded contributions/withdrawals before the projection start."} Assumes subsequent scheduled deposits are paid on their due dates, including any due on maturity day.</p>
    <p className="sub">{sip ? "SIP returns are an assumption, not guaranteed interest; actual investments can lose value." : "Indicative estimate; your bank’s calculation and payout terms may differ."} Projections do not change your recorded balance.</p>
  </section>;
}
