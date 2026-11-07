import { dateText } from "./DateInput";
import { eligibleInstallments } from "./installmentHistory";
import { today } from "./money";
import type { Data, Kind, Transaction } from "./types";

export function InstallmentHistory({kind,values,transactions,recordId,useCount}:{kind:Kind;values:Data;transactions:Transaction[];recordId?:string;useCount:(count:number)=>void}) {
  const eligible=eligibleInstallments(kind,values), count=Number(values.previously_paid_installments || 0);
  const firstRecorded=eligible.findIndex(d=>transactions.some(t=>t.source_id===recordId && t.cycle===d.cycle));
  const suggestion=firstRecorded<0 ? eligible.length : firstRecorded;
  return <div className="history-help">
    <p><strong>{eligible.length} installments due by {dateText(today())}</strong></p>
    <p>Payments made before tracking began. Opening balances stay unchanged.</p>
    {suggestion>0 && <button type="button" className="secondary" onClick={()=>useCount(suggestion)}>Use {suggestion} previously paid installments</button>}
    {count>0 && count<=eligible.length && <p>Marks {dateText(eligible[0].date)} through {dateText(eligible[count-1].date)} as previously paid. Save to apply.</p>}
    {firstRecorded>=0 && <p>Recorded payments are already counted. They cannot also be marked as opening payment history.</p>}
  </div>;
}
