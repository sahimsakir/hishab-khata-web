import { dateText } from "./DateInput";
import { money, parseMoney } from "./money";
import type { Data, Transaction } from "./types";
import { projectSavings } from "./savings";

export function SavingsEstimate({ data, transactions, planId, balance }: { data: Data; transactions?: readonly Transaction[]; planId?: string; balance?: number }) {
  if (data.type === "Goal") return null;
  const estimate = projectSavings(data, transactions, planId);
  const deposit = data.type === "DPS" || data.type === "FDR";
  const rate = data.annual_rate == null || data.annual_rate === "" ? NaN : Number(data.annual_rate);
  const principal = balance ?? readAmount(data, "opening");
  const accrued = readAmount(data, "bank_accrued_interest");
  const hasReportedInterest = data.bank_accrued_interest_paisa != null || Boolean(data.bank_accrued_interest);
  const monthlyInterest = deposit && Number.isFinite(rate) && rate >= 0 && rate <= 100
    ? Math.round(principal * rate / 1200)
    : null;
  const sip = data.type === "SIP";
  return <section className="savings-estimate" aria-label="Estimated savings returns">
    {deposit && <dl aria-label="Savings balance and monthly interest">
      <div><dt>Recorded balance</dt><dd>{money(principal)}</dd></div>
      {monthlyInterest !== null && <div><dt>Estimated interest for one month</dt><dd>{money(monthlyInterest)}</dd></div>}
      {hasReportedInterest && <>
        <div><dt>Bank-reported accrued interest</dt><dd>{money(accrued)}</dd></div>
        <div><dt>Balance plus reported interest</dt><dd>{money(principal + accrued)}</dd></div>
      </>}
    </dl>}
    {deposit && monthlyInterest !== null && <p className="sub">Monthly estimate uses the recorded balance × annual rate ÷ 12. Bank accrual can vary with deposit dates and compounding.</p>}
    {!estimate ? <p className="sub">Enter a rate and valid dates to estimate maturity returns.</p> : <>
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
    </>}
  </section>;
}


function readAmount(data: Data, field: string) {
  if (data[field + "_paisa"] != null) return Number(data[field + "_paisa"]);
  try {
    return parseMoney(String(data[field] || "0"));
  } catch {
    return 0;
  }
}
