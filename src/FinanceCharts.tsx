import { dateText } from "./DateInput";
import type { Snapshot } from "./types";
import { money } from "./money";
import { chartColors, chartData } from "./chartData";
const compact=(paisa:number)=> new Intl.NumberFormat("en",{notation:"compact",maximumFractionDigits:1}).format(paisa/100);
export function FinanceCharts({data}:{data:Snapshot}) {
  const {buckets,slices,total,monthly,step,monthStep}=chartData(data.transactions,data.from,data.to);
  const maximum=Math.max(100,...buckets.flatMap(b=>[b.income,b.expense]));
  let cumulative=0;
  const gradient=slices.map((c,i)=>{const start=cumulative;cumulative+=c.value/total*100;return `${chartColors[i]} ${start}% ${cumulative}%`;}).join(",");
  const label=(key:string)=>new Date(key+(key.length===7?"-01":"")+"T00:00:00Z").toLocaleDateString("en-GB",{timeZone:"UTC",month:"short",...(monthly?{year:"2-digit"}:{day:"numeric"})});
  return <div className="finance-charts">
    <section className="card trend-card" aria-label="Income and expenses chart">
      <div className="cardtitle"><h2>Income & expenses</h2><div className="chart-legend"><span><i style={{background:chartColors[0]}}/>Income</span><span><i style={{background:chartColors[2]}}/>Expenses</span></div></div>
      <p className="sub">{dateText(data.from)} – {dateText(data.to)} · {monthly ? `${monthStep}-month` : `${step}-day`} groups</p>
      {buckets.every(b=>!b.income&&!b.expense) ? <div className="chart-empty">No income or expenses in this period</div> : <>
        <div className="trend-plot" role="img" aria-label="Income and expenses by period. Exact values available in chart data below.">
          <div className="chart-scale"><span>৳{compact(maximum)}</span><span>৳{compact(maximum/2)}</span><span>৳0</span></div>
          <div className="trend-bars">{buckets.map(b=><div className="trend-group" key={b.key}><div className="bar-pair"><div className="trend-bar income" style={{height:`${b.income/maximum*100}%`}} title={`${label(b.key)} · Income ${money(b.income)}`}/><div className="trend-bar expense" style={{height:`${b.expense/maximum*100}%`}} title={`${label(b.key)} · Expenses ${money(b.expense)}`}/></div><span>{label(b.key)}</span></div>)}</div>
        </div>
        <details className="calculation-details"><summary>View chart data</summary><div className="table-wrap"><table><thead><tr><th>Period starting</th><th>Income</th><th>Expenses</th></tr></thead><tbody>{buckets.map(b=><tr key={b.key}><td>{label(b.key)}</td><td>{money(b.income)}</td><td>{money(b.expense)}</td></tr>)}</tbody></table></div></details>
      </>}
    </section>
    <section className="card" aria-label="Spending pie chart">
      <h2>Spending by category</h2>
      {total===0 ? <div className="chart-empty">No expenses in this period</div> : <div className="pie-layout"><div className="spending-pie" role="img" aria-label={`Total expenses ${money(total)}. Breakdown listed below.`} style={{background:`conic-gradient(${gradient})`}}><div><small>Total expenses</small><strong>{money(total)}</strong></div></div><ul className="pie-legend">{slices.map((c,i)=><li key={c.name}><i style={{background:chartColors[i]}}/><span>{c.name}<small>{(c.value/total*100).toFixed(1)}%</small></span><b>{money(c.value)}</b></li>)}</ul></div>}
    </section>
  </div>;
}
