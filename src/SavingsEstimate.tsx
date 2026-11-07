import { dateText } from "./DateInput";
import { money } from "./money";
import type { Data, Transaction } from "./types";
import { projectSavings } from "./savings";

export function SavingsEstimate({ data, transactions, planId }: { data: Data; transactions?: readonly Transaction[]; planId?: string }) {
  if (data.type === "Goal") return null;
  const estimate = projectSavings(data, transactions, planId);
  const sip = data.type === "SIP";
  return <section className="savings-estimate" aria-label="Estimated savings returns">
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


export function SavingsBalance({ data, balance }: { data: Data; balance: number }) {
  const reported = data.bank_accrued_interest_paisa;
  const rate = data.annual_rate == null || data.annual_rate === "" ? NaN : Number(data.annual_rate);
  const monthly = Number.isFinite(rate) ? Math.round(balance * rate / 1200) : null;
  const total = reported == null ? balance : balance + Number(reported);

  return <>
    <div className="bigamount">{money(total)}</div>
    <p className="sub">{reported == null ? "Recorded savings balance" : "Balance including bank-reported interest"}</p>
    <section className="savings-estimate" aria-label="Savings interest breakdown"><dl>
      <div><dt>Recorded savings</dt><dd>{money(balance)}</dd></div>
      <div><dt>Bank-reported accrued interest</dt><dd>{reported == null ? "Not entered" : money(Number(reported))}</dd></div>
      {monthly !== null && <>
        <div><dt>Estimated interest for one month</dt><dd>{money(monthly)}</dd></div>
        <div><dt>Estimated balance after one month</dt><dd>{money(total + monthly)}</dd></div>
      </>}
    </dl></section>
  </>;
}
