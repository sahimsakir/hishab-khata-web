import type { Data, Kind, MoneyRecord } from "./types";
import { decimal, today } from "./money";
import { growthMethods } from "./savings";
import { eligibleInstallments } from "./installmentHistory";
export const categories = [
  "Food & groceries",
  "Rent & bills",
  "Transport",
  "Shopping",
  "Family",
  "Health",
  "Entertainment",
  "Education",
  "Business",
  "Salary",
  "Freelance",
  "Savings",
  "Other",
];
export interface Field {
  name: string;
  label: string;
  type?: string;
  options?: [string, string][];
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
}
const opts = (a: string[]) => a.map((s) => [s, s] as [string, string]);
const text = (name: string, label: string): Field => ({
  name,
  label,
  required: true,
});
const amount = (name: string, label: string): Field => ({
  name,
  label: label + " (৳)",
  type: "number",
  required: true,
  min: "0",
  max: "9999999999.99",
  step: "0.01",
});
const select = (name: string, label: string, a: string[]): Field => ({
  ...text(name, label),
  options: opts(a),
});
const historyField = (kind: Kind, values: Data): Field => ({name:"previously_paid_installments",label:"Previously paid installments",type:"number",min:"0",max:String(eligibleInstallments(kind,values).length),step:"1"});
const schedule: Field[] = [
  {
    name: "day",
    label: "Due day of month",
    type: "number",
    required: true,
    min: "1",
    max: "31",
    step: "1",
  },
  {
    name: "start",
    label: "First scheduled month",
    type: "month",
    required: true,
  },
  { name: "end", label: "Last month (optional)", type: "month" },
];
export const kindLabels: Record<Kind, string> = {
  accounts: "Accounts",
  incomes: "Income sources",
  loans: "Loans & EMI",
  cards: "Credit cards",
  savings: "Savings & investments",
  bills: "Recurring bills",
  budgets: "Budgets",
};
export const kindSingular: Record<Kind, string> = {
  accounts: "account",
  incomes: "income source",
  loans: "loan",
  cards: "credit card",
  savings: "savings plan",
  bills: "recurring bill",
  budgets: "budget",
};
export function recordFields(kind: Kind, records: MoneyRecord[], values: Data = {}): Field[] {
  const account: Field = {
    ...text("account_id", "Money account"),
    options: records
      .filter((r) => r.kind === "accounts")
      .map((r) => [r.id, r.name]),
  };
  const type = String(values.type ?? "");
  const frequency: Field = {name:"frequency",label:"Frequency",options:[["monthly","Monthly"],["once","One-time"]],required:true};
  const timing = values.frequency === "once" ? [{name:"payment_date",label:kind === "incomes" ? "Receipt date" : "Payment date",type:"date",required:true}] : schedule;
  const incomeExtra: Record<string, string> = {Salary:"Employer", "Business profit":"Business name", Freelance:"Client", "Rental income":"Property", "Dividend / interest":"Institution"};
  const fields = (
    {
      accounts: [
        select("type", "Account type", [
          "Cash",
          "Bank",
          "Mobile wallet",
          "Business account",
          "Other",
        ]),
        ...(["Bank","Business account"].includes(type) ? [text("institution", "Bank")] : type === "Mobile wallet" ? [text("institution", "Provider")] : []),
        amount("opening", "Opening balance"),
      ],
      incomes: [
        select("type", "Income type", [
          "Salary",
          "Business profit",
          "Freelance",
          "Rental income",
          "Dividend / interest",
          "Other",
        ]),
        ...(incomeExtra[type] ? [{name:"payer",label:incomeExtra[type],required:false}] : []),
        amount("amount", type === "Salary" ? "Salary" : type === "Business profit" ? "Net profit" : type === "Rental income" ? "Rent" : type === "Dividend / interest" ? "Return" : "Income amount"),
        {...account,label:"Receiving account"},
        frequency,
        ...timing,
      ],
      bills: [
        amount("amount", "Bill amount"),
        select("category", "Category", categories),
        {...account,label:"Payment account"},
        frequency,
        ...timing,
      ],
      loans: [
        select("type", "Loan type", [
          "Personal",
          "Car",
          "Home",
          "Business",
          "Education",
          "Family / friend",
          "Credit card EMI",
          "Other",
        ]),
        text("lender", type === "Family / friend" ? "Lender" : "Bank"),
        amount("opening", "Opening principal outstanding"),
        {...amount("emi", "Monthly EMI override (blank to calculate)"), required:false},
        {...amount("processing_fee", "Processing fee"), required:false},
        ...(type === "Family / friend" ? [{name:"interest_bearing",label:"Interest",options:[["no","Interest-free"],["yes","Interest-bearing"]],required:true} as Field] : []),
        ...((type !== "Family / friend" || (values.interest_bearing === "yes" || (!values.interest_bearing && Number(values.rate) > 0))) ? [{
          name: "rate",
          label: "Annual interest rate (%)",
          type: "number",
          min: "0",
          max: "100",
          step: "0.01",
          required: true,
        } as Field] : []),
        ...schedule.filter((f) => f.name !== "end"),
        {
          name: "term",
          label: "Loan tenure (months)",
          type: "number",
          min: "1",
          max: "600",
          required: true,
        },
        historyField("loans",values),
      ],
      cards: [
        text("bank", "Bank"),
        amount("limit", "Credit limit"),
        amount("opening", "Opening outstanding"),
        amount("statement", "Current statement balance"),
        amount("minimum", "Minimum payment"),
        {
          name: "statement_date",
          label: "Statement date",
          type: "date",
          required: true,
        },
        {
          name: "due_date",
          label: "Payment due date",
          type: "date",
          required: true,
        },
      ],
      savings: investmentFields(values),
      budgets: [
        select("category", "Category", categories),
        amount("limit", "Monthly limit"),
      ],
    } satisfies Record<Kind, Field[]>
  )[kind];
  const optionLabels: Record<string,string> = {"Family / friend":"Personal lender","Dividend / interest":"Investment return","Goal":"Savings goal"};
  return fields.map(f => f.options ? {...f,options:f.options.map(([key,label]) => [key,optionLabels[label] ?? label])} : f);
}

export function investmentFields(values: Data): Field[] {
  const type = String(values.type ?? "DPS");
  const goal = type === "Goal", fdr = type === "FDR", sip = type === "SIP";
  const monthly = !goal && !fdr && (values.calculation_basis ?? "monthly_installments") === "monthly_installments";
  return [
    select("type", "Investment type", ["DPS","FDR","SIP","Goal"]),
    ...(!goal ? [text("bank", sip ? "Fund manager" : "Bank")] : []),
    ...(fdr ? [amount("target","Deposit amount")] : goal ? [amount("target","Target amount")] : []),
    amount("opening", sip ? "Initial investment" : "Opening balance"),
    ...(["DPS","FDR"].includes(type) ? [{...amount("bank_accrued_interest","Bank-reported accrued interest"),required:false}] : []),
    ...(!fdr ? [amount("monthly", sip ? "Monthly investment" : goal ? "Monthly saving" : "Monthly installment")] : []),
    {name:"opening_date",label:sip ? "Investment start date" : goal ? "Start date" : "Opening date",type:"date",required:true},
    ...(!fdr ? [
      {name:"first_payment",label:sip ? "First investment date" : goal ? "First saving date" : "First installment date",type:"date",required:true} as Field,
      {name:"day",label:sip ? "Investment day" : goal ? "Saving day" : "Payment day",type:"number",min:"1",max:"31",step:"1",required:true} as Field,
    ] : []),
    {name:"maturity_mode",label:"Maturity method",options:[["duration","Tenure"],["exact","Exact date"]],required:true},
    {name:"term_value",label:"Duration",type:"number",min:"1",max:values.term_unit === "years" ? "100" : "1200",step:"1",required:values.maturity_mode !== "exact"},
    {name:"term_unit",label:"Duration unit",options:[["months","Months"],["years","Years"]],required:true},
    {name:"maturity",label:goal ? "Target date" : sip ? "Investment end date" : "Maturity date",type:"date",required:true},
    ...(!goal ? [{name:"annual_rate",label:sip ? "Expected annual return (%)" : "Annual interest rate (%)",type:"number",min:sip ? "-99.99" : "0",max:"100",step:"0.01",required:true} as Field] : []),
    ...(!fdr && !goal ? [{name:"calculation_basis",label:"Calculation method",options:[["monthly_installments","Monthly installments"],["actual_days","Actual days"]],required:true} as Field] : []),
    ...(monthly ? [{name:"payment_timing",label:sip ? "Investment timing" : "Installment timing",options:[["beginning","Beginning of month"],["end","End of month"]],required:true} as Field] : !goal ? [
      {name:"compounding",label:"Interest method",options:growthMethods,required:true} as Field,
      ...(!fdr ? [{name:"projection_start",label:"Projection date",type:"date",required:true} as Field] : []),
    ] : []),
    ...(["DPS","SIP"].includes(type) ? [historyField("savings",values)] : []),
  ];
}

export function recordFieldGroups(kind: Kind, records: MoneyRecord[], values: Data): {title: string; fields: Field[]}[] {
  const fields=recordFields(kind,records,values);
  if(kind === "loans") {
    const groups:[string,string[]][]=[["Loan details",["type","lender","opening","interest_bearing","rate","processing_fee"]],["Repayment schedule",["emi","start","day","term"]],["Payment history",["previously_paid_installments"]]];
    return groups.map(([title,names])=>({title,fields:names.flatMap(name=>fields.filter(f=>f.name===name))})).filter(g=>g.fields.length>0);
  }
  if(kind !== "savings") return [{title:"",fields}];
  const groups: [string,string[]][] = [
    ["Investment details",["type","bank","target","opening","monthly","bank_accrued_interest"]],
    [values.type === "Goal" ? "Saving period" : "Duration & maturity",["opening_date","term_value","term_unit","maturity_mode","maturity"]],
    [values.type === "SIP" ? "Return calculation" : "Interest calculation",["annual_rate","calculation_basis","compounding","payment_timing","projection_start"]],
    ["Payment schedule",["first_payment","day"]],
    ["Payment history",["previously_paid_installments"]],
  ];
  return groups.map(([title,names])=>({title,fields:names.flatMap(name=>fields.filter(f=>f.name===name))})).filter(group=>group.fields.length>0);
}

export function recordValues(
  record: MoneyRecord | undefined,
  fields: Field[],
): Record<string, string> {
  return Object.fromEntries(
    fields.map((f) => {
      const v = record?.data[f.name];
      if (f.name === "emi" && record?.data.emi_auto === "yes") return [f.name, ""];
      if (f.name in (record?.data ?? {})) return [f.name, String(v ?? "")];
      if (record?.data[f.name + "_paisa"] !== undefined)
        return [f.name, decimal(Number(record.data[f.name + "_paisa"]))];
      if (f.name === "calculation_basis") return [f.name,"monthly_installments"];
      if (f.name === "payment_timing") return [f.name,"beginning"];
      if (f.name === "frequency") return [f.name,"monthly"];
      if (f.name === "interest_bearing") return [f.name, Number(record?.data.rate ?? 0) > 0 ? "yes" : "no"];
      if (f.name === "opening_date") return [f.name, String(record?.data.projection_start ?? (record?.data.start ? String(record.data.start)+"-01" : today()))];
      if (f.name === "first_payment") return [f.name, String(record?.data.opening_date ?? record?.data.projection_start ?? today())];
      if (f.name === "start") return [f.name, today().slice(0, 7)];
      if (f.name === "maturity_mode") return [f.name, record ? "exact" : "duration"];
      if (f.name === "term_value") return [f.name, "3"];
      if (f.name === "term_unit") return [f.name, "years"];
      if (f.name === "annual_rate") return [f.name, ""];
      if (f.name === "compounding") return [f.name, "monthly"];
      if (f.type === "date") return [f.name, today()];
      if (f.name === "day") return [f.name, "1"];
      if (f.name === "term") return [f.name, "12"];
      if (f.type === "number" && !f.required) return [f.name, ""];
      if (f.type === "number") return [f.name, "0"];
      return [f.name, f.options?.[0]?.[0] ?? ""];
    }),
  );
}
export const notes: Record<Kind, string> = {
  accounts:
    "Opening balance is money you already owned before your recorded transactions. It is not new income.",
  incomes:
    "Income sources are monthly expectations. Record a receipt to add money to your balance. For a business, use profit after costs or consistently record revenue and costs separately.",
  loans:
    "Enter the outstanding principal before your tracked repayments, and the EMI from your lender. Adding a loan does not add cash. For each EMI, enter the lender’s actual principal portion; the remainder is interest.",
  cards:
    "No card numbers or security codes are needed. Opening debt is what you already owed. A statement is a payment target, not an additional expense. Update it each cycle from your bank.",
  savings:
    "Opening balance is money saved before your tracked transactions. DPS/SIP projections include that balance plus recorded contributions/withdrawals before the projection start; later deposits follow the schedule. If today’s deposit is already recorded, start the projection tomorrow. For FDR, target/principal is the single planned investment: set monthly contribution to zero. Enter your bank’s annual nominal rate or an assumed SIP rate; rates are not looked up automatically. Record actual movements separately.",
  bills:
    "Monthly bills appear in your planner until paid. Due days 29–31 use the last day in shorter months.",
  budgets:
    "Category limits repeat monthly. Cash and credit card purchases are included; repayments are tracked separately.",
};
