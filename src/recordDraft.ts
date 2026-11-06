import { decimal, parseMoney } from "./money";
import { investmentMonths, updateMaturity } from "./maturity";
import { recordFields, recordValues } from "./forms";
import type { Kind, MoneyRecord } from "./types";

export function normalizeSavings(values: Record<string,string>): Record<string,string> {
  const v = updateMaturity({...values});
  const opening = v.opening_date;
  if (!opening) return v;
  if (v.type === "FDR") {
    v.monthly="0"; v.start=opening.slice(0,7); v.day=String(Number(opening.slice(8))); v.projection_start=opening; v.calculation_basis="actual_days";
  } else {
    v.first_payment ||= opening;
    v.start=v.first_payment.slice(0,7);
    if (v.type === "Goal") {v.bank="Personal savings";v.annual_rate="";v.compounding="";v.projection_start=opening;v.calculation_basis="actual_days";}
    else if (v.calculation_basis === "monthly_installments") {v.compounding="monthly";v.projection_start=opening;}
    try {
      if (v.type !== "Goal") {
        const count = investmentMonths(v) ?? 1;
        const principal=parseMoney(v.monthly)*count+(v.type === "SIP" ? parseMoney(v.opening) : 0);
        v.target=decimal(principal);
      }
    } catch { v.target="0"; }
  }
  return v;
}

export function recordDraft(kind: Kind, records: MoneyRecord[], record?: MoneyRecord): Record<string,string> {
  const data=record?.data ?? {};
  const v=recordValues(record,recordFields(kind,records,data));
  if(kind !== "savings") return v;
  v.type ||= "DPS";
  v.first_payment ||= v.opening_date;
  v.compounding ||= String(data.compounding ?? "monthly");
  v.projection_start ||= String(data.projection_start ?? v.opening_date);
  v.calculation_basis ||= ["DPS","SIP"].includes(v.type) ? "monthly_installments" : "actual_days";
  v.payment_timing ||= "beginning";
  if (v.maturity_mode === "exact") {
    const months=investmentMonths(v);
    v.term_value=months ? String(months % 12 === 0 ? months / 12 : months) : "";
    v.term_unit=months && months % 12 === 0 ? "years" : "months";
  }
  return normalizeSavings(v);
}

export function changeRecordField(kind: Kind, records: MoneyRecord[], previous: Record<string,string>, name: string, value: string) {
  let next={...previous,[name]:value};
  if(kind === "savings" && ["term_value","term_unit"].includes(name)) next.maturity_mode="duration";
  if(name === "type") {
    const defaults=recordValues(undefined,recordFields(kind,records,{type:value}));
    next={...defaults,...Object.fromEntries(Object.keys(defaults).filter(k=>k in previous).map(k=>[k,previous[k]])),type:value};
    if(kind === "incomes") next.payer="";
    if(kind === "accounts") next.institution="";
    if(kind === "savings" && ((previous.type === "SIP") !== (value === "SIP"))) next.bank="";
    if(kind === "savings") {next.calculation_basis=["DPS","SIP"].includes(value)?"monthly_installments":"actual_days";next.compounding="monthly";next.payment_timing="beginning";}
  }
  if(name === "opening_date" && (!previous.first_payment || previous.first_payment === previous.opening_date)) next.first_payment=value;
  if(name === "opening_date" && previous.projection_start === previous.opening_date) next.projection_start=value;
  return kind === "savings" ? normalizeSavings(next) : next;
}
