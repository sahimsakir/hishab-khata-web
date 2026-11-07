import { dateText } from "./DateInput";
import { money } from "./money";
import type { Data, Transaction } from "./types";
import { projectSavings } from "./savings";

export function SavingsEstimate({ data, transactions, planId }: { data: Data; transactions?: readonly Transaction[]; planId?: string }) {
  if (data.type === "Goal") return null;
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
    <details className="calculation-details"><summary>Calculation details</summary>
      <p className="sub">{dateText(String(data.opening_date || data.projection_start))} – {dateText(String(data.maturity))} · Before taxes and fees.</p>
      <p className="sub">{sip ? "Expected returns are not guaranteed. Investments can lose value." : "Estimated return. Bank payout terms may differ."}</p>
    </details>
  </section>;
}
