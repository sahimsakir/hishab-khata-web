import { money } from "./money";
import type { Data, Transaction } from "./types";
import { projectSavings } from "./savings";

export function SavingsEstimate({ data, transactions, planId, balance }: { data: Data; transactions?: readonly Transaction[]; planId?: string; balance?: number }) {
  if (data.type === "Goal") return null;
  const estimate = projectSavings(data, transactions, planId);
  const sip = data.type === "SIP";
  return <section className="savings-estimate" aria-label="Estimated savings returns">
    {data.bank_accrued_interest_paisa != null && balance !== undefined && <dl>
      <div><dt>Bank-reported accrued interest</dt><dd>{money(Number(data.bank_accrued_interest_paisa))}</dd></div>
      <div><dt>Balance plus reported interest</dt><dd>{money(balance + Number(data.bank_accrued_interest_paisa))}</dd></div>
    </dl>}
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

    </>}
  </section>;
}


