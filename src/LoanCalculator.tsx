import { useState } from "react";
import { money, parseMoney } from "./money";

export function loanEstimate(principal: number, annualRate: number, months: number, fee: number) {
  if (!Number.isSafeInteger(principal) || principal <= 0 || !Number.isSafeInteger(fee) || fee < 0 ||
    !Number.isFinite(annualRate) || annualRate < 0 || annualRate > 100 ||
    !Number.isInteger(months) || months < 1 || months > 600) return null;

  const monthlyRate = annualRate / 1200;
  const payment = monthlyRate === 0
    ? principal / months
    : principal * monthlyRate / -Math.expm1(-months * Math.log1p(monthlyRate));
  const repayment = Math.round(payment * months);
  return { emi: Math.round(payment), interest: repayment - principal, repayment, total: repayment + fee };
}

export function LoanEstimate({ principal, rate, months, fee }: {
  principal: string; rate: string; months: number; fee: string;
}) {
  let estimate;
  let feePaisa;
  try {
    feePaisa = parseMoney(fee || "0");
    estimate = rate.trim() === "" ? null : loanEstimate(parseMoney(principal), Number(rate), months, feePaisa);
  } catch {
    estimate = null;
  }
  if (!estimate || feePaisa === undefined) return <p className="sub">Enter the loan amount, annual rate and tenure to calculate EMI.</p>;

  return <section className="savings-estimate" aria-label="Loan repayment estimate">
    <dl>
      <div><dt>Estimated monthly EMI</dt><dd>{money(estimate.emi)}</dd></div>
      <div><dt>Total interest</dt><dd>{money(estimate.interest)}</dd></div>
      <div><dt>Total repayments</dt><dd>{money(estimate.repayment)}</dd></div>
      <div><dt>Processing fee</dt><dd>{money(feePaisa)}</dd></div>
      <div><dt>Total outlay including fee</dt><dd>{money(estimate.total)}</dd></div>
    </dl>
    <p className="sub">Fixed rate, reducing balance. Processing fee is paid separately. Lender rounding may change the final installment.</p>
  </section>;
}

export function LoanCalculator() {
  const [principal, setPrincipal] = useState("1000000");
  const [rate, setRate] = useState("12");
  const [term, setTerm] = useState("5");
  const [unit, setUnit] = useState("years");
  const [fee, setFee] = useState("");
  return <details className="card">
    <summary><strong>Loan EMI calculator</strong></summary>
    <div className="formgrid">
      <label>Loan amount (৳)<input type="number" min="0" step="0.01" value={principal} onChange={e => setPrincipal(e.target.value)} /></label>
      <label>Annual interest rate (%)<input type="number" min="0" max="100" step="0.01" value={rate} onChange={e => setRate(e.target.value)} /></label>
      <label>Tenure<input type="number" min="1" step="1" value={term} onChange={e => setTerm(e.target.value)} /></label>
      <label>Tenure unit<select value={unit} onChange={e => setUnit(e.target.value)}><option value="years">Years</option><option value="months">Months</option></select></label>
      <label>Processing fee (৳)<input type="number" min="0" step="0.01" value={fee} onChange={e => setFee(e.target.value)} /></label>
    </div>
    <LoanEstimate principal={principal} rate={rate} months={Number(term) * (unit === "years" ? 12 : 1)} fee={fee} />
  </details>;
}
