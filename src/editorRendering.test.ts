import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EditorDialog } from "./Editors";
import { changeRecordField, recordDraft } from "./recordDraft";
import type { MoneyRecord, Snapshot } from "./types";

const snapshot: Snapshot = {records:[],transactions:[],balances:{},planner:[],summary:{},from:"2026-11-01",to:"2026-11-30"};
const record=(type:string):MoneyRecord=>({id:"fixture",kind:"savings",name:"Fixture",data:{type,bank:"Institution",opening_paisa:0,target_paisa:36000000,monthly_paisa:type==="FDR"?0:1000000,opening_date:"2026-07-07",first_payment:"2026-07-07",day:8,start:"2026-07",maturity_mode:"exact",maturity:"2029-07-07",annual_rate:9,compounding:"monthly",calculation_basis:type==="FDR"?"actual_days":"monthly_installments",projection_start:"2026-07-07",payment_timing:"beginning"}});
const render=(type:string)=>renderToStaticMarkup(createElement(EditorDialog,{editor:{mode:"record",kind:"savings",record:record(type)},data:snapshot,close:()=>{},saved:async()=>{}}));

describe("investment editor controls",()=>{
  it("renders duration controls and interest section for an existing exact-date DPS",()=>{
    const html=render("DPS");
    expect(html).toContain('name="term_value"');
    expect(html).toContain('name="term_unit"');
    expect(html).toContain('value="years" selected=""');
    expect(html).toContain('Interest calculation');
    expect(html).toContain('Annual interest rate (%)');
    expect(html).toContain('414,613.61');
  });
  it("switches an exact-date plan to automatic maturity when duration changes",()=>{
    const draft=recordDraft("savings",[],record("DPS"));
    expect(draft.term_value).toBe("3");expect(draft.term_unit).toBe("years");
    const changed=changeRecordField("savings",[],draft,"term_value","2");
    expect(changed.maturity_mode).toBe("duration");expect(changed.maturity).toBe("2028-07-07");
  });
  it("keeps duration and interest controls on FDR without installment fields",()=>{
    const html=render("FDR");
    expect(html).toContain('name="term_unit"');expect(html).toContain('name="annual_rate"');
    expect(html).not.toContain('name="monthly"');expect(html).not.toContain('name="first_payment"');
  });
  it("uses return fields on SIP and no interest fields on savings goals",()=>{
    expect(render("SIP")).toContain('Return calculation');
    expect(render("SIP")).toContain('Expected annual return (%)');
    expect(render("Goal")).not.toContain('name="annual_rate"');
  });
});

describe("savings contribution allocation",()=>{
  const transactionEditor=(type:string)=>renderToStaticMarkup(createElement(EditorDialog,{editor:{mode:"transaction",defaults:{type:"saving",saving_id:"fixture"}},data:{...snapshot,records:[record(type)]},close:()=>{},saved:async()=>{}}));
  it("shows an installment month for recurring savings",()=>{expect(transactionEditor("DPS")).toContain('name="installment_month"');expect(transactionEditor("SIP")).toContain('name="installment_month"');});
  it("does not ask for an installment month for a one-time FDR",()=>{expect(transactionEditor("FDR")).not.toContain('name="installment_month"');});
});
