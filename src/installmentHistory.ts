import { today } from "./money";
import { investmentMonths } from "./maturity";
import type { Data, Kind } from "./types";

export function eligibleInstallments(kind: Kind, data: Data, cutoff = today()): {cycle:string;date:string}[] {
  if (kind !== "loans" && !(kind === "savings" && ["DPS","SIP"].includes(String(data.type)))) return [];
  const start=String(data.start ?? ""), day=Number(data.day);
  if(!/^\d{4}-\d{2}$/.test(start) || !Number.isInteger(day) || day<1 || day>31) return [];
  const [year,month]=start.split("-").map(Number);
  if(year<1000 || month<1 || month>12) return [];
  const max=kind === "loans" ? Number(data.term) : Number(data.installment_count ?? (data.calculation_basis === "monthly_installments" ? investmentMonths(data) : 1200));
  if(!Number.isInteger(max) || max<1 || max>1200) return [];
  const rows:{cycle:string;date:string}[]=[];
  for(let n=0;n<max;n++) {
    const index=year*12+month-1+n, y=Math.floor(index/12), m=index%12;
    const cycle=`${y}-${String(m+1).padStart(2,"0")}`;
    if(cycle>cutoff.slice(0,7) || (data.end && cycle>String(data.end)))break;
    const d=Math.min(day,new Date(Date.UTC(y,m+1,0)).getUTCDate());
    const date=kind === "savings" && n===0 && data.first_payment ? String(data.first_payment) : `${cycle}-${String(d).padStart(2,"0")}`;
    if(kind === "savings" && (!data.maturity || date>String(data.maturity) || (data.maturity_mode === "duration" && data.calculation_basis !== "monthly_installments" && !data.installment_count && date===data.maturity)))break;
    if(date<=cutoff)rows.push({cycle,date});
  }
  return rows;
}
