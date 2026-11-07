import type { Transaction } from "./types";
export const chartColors = ["#6655db", "#2e99d5", "#20af99", "#f0ad46", "#e2739b", "#95a1bd"];
export function chartData(transactions: readonly Transaction[], from: string, to: string) {
  const start = Date.parse(from + "T00:00:00Z"), end = Date.parse(to + "T00:00:00Z");
  const days = Math.round((end-start)/86400000)+1;
  const monthly = days > 62;
  const buckets = new Map<string,{key:string;income:number;expense:number}>();
  // At most 12 groups, including empty periods.
  const step = Math.max(1,Math.ceil(days/12));
  const monthCount = (Number(to.slice(0,4))-Number(from.slice(0,4)))*12+Number(to.slice(5,7))-Number(from.slice(5,7))+1;
  const monthStep = Math.max(1,Math.ceil(monthCount/12));
  const keyFor=(date:string)=> {
    if(monthly){const offset=(Number(date.slice(0,4))-Number(from.slice(0,4)))*12+Number(date.slice(5,7))-Number(from.slice(5,7));const d=new Date(start);d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+Math.floor(offset/monthStep)*monthStep);return d.toISOString().slice(0,7);}
    return new Date(start+Math.floor((Date.parse(date+"T00:00:00Z")-start)/86400000/step)*step*86400000).toISOString().slice(0,10);
  };
  for(let i=0;i<days;i++) {const key=keyFor(new Date(start+i*86400000).toISOString().slice(0,10));if(!buckets.has(key)) buckets.set(key,{key,income:0,expense:0});}
  const categories = new Map<string,number>();
  for(const t of transactions){
    if(t.date<from || t.date>to) continue;
    const bucket=buckets.get(keyFor(t.date))!;
    if(t.type==="income") bucket.income+=t.amount_paisa;
    const cost=t.type==="expense" ? t.amount_paisa : ["loan_payment","transfer"].includes(t.type) ? t.interest_paisa : 0;
    if(cost>0){bucket.expense+=cost;const name=t.type==="transfer" ? "Transfer fees" : t.type==="loan_payment" ? "Loan interest" : t.category || "Other";categories.set(name,(categories.get(name)||0)+cost);}
  }
  const sorted=[...categories].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  const slices=sorted.length>6 ? [...sorted.slice(0,5),{name:"Other categories",value:sorted.slice(5).reduce((s,c)=>s+c.value,0)}] : sorted;
  return {buckets:[...buckets.values()],slices,total:sorted.reduce((s,c)=>s+c.value,0),monthly,step,monthStep};
}
