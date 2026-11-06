import type { Kind, MoneyRecord } from "./types";
import { decimal, today } from "./money";
import { growthMethods } from "./savings";
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
export function recordFields(kind: Kind, records: MoneyRecord[]): Field[] {
  const account: Field = {
    ...text("account_id", "Money account"),
    options: records
      .filter((r) => r.kind === "accounts")
      .map((r) => [r.id, r.name]),
  };
  return (
    {
      accounts: [
        select("type", "Account type", [
          "Cash",
          "Bank",
          "Mobile wallet",
          "Business account",
          "Other",
        ]),
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
        amount("amount", "Expected monthly income"),
        account,
        ...schedule,
      ],
      bills: [
        amount("amount", "Monthly bill"),
        select("category", "Category", categories),
        account,
        ...schedule,
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
        text("lender", "Bank / lender / person"),
        amount("opening", "Opening principal outstanding"),
        amount("emi", "Monthly EMI"),
        {
          name: "rate",
          label: "Annual interest rate (%) — reference",
          type: "number",
          min: "0",
          max: "100",
          step: "0.01",
          required: true,
        },
        ...schedule.filter((f) => f.name !== "end"),
        {
          name: "term",
          label: "Number of scheduled EMIs",
          type: "number",
          min: "1",
          max: "600",
          required: true,
        },
      ],
      cards: [
        text("bank", "Bank / provider"),
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
      savings: [
        select("type", "Savings type", ["DPS", "FDR", "SIP", "Goal"]),
        text("bank", "Bank / institution"),
        amount("target", "Target / principal"),
        amount("opening", "Opening saved balance"),
        amount("monthly", "Monthly contribution"),
        { name: "annual_rate", label: "Annual interest / expected SIP return (%)", type: "number", min: "-99.99", max: "100", step: "0.01", required: true },
        { name: "compounding", label: "Growth calculation", options: growthMethods, required: true },
        { name: "projection_start", label: "Projection start / FDR deposit date", type: "date", required: true },
        ...schedule.filter((f) => f.name !== "end"),
        {
          name: "maturity",
          label: "Maturity / target date",
          type: "date",
          required: true,
        },
      ],
      budgets: [
        select("category", "Category", categories),
        amount("limit", "Monthly limit"),
      ],
    } satisfies Record<Kind, Field[]>
  )[kind];
}
export function recordValues(
  record: MoneyRecord | undefined,
  fields: Field[],
): Record<string, string> {
  return Object.fromEntries(
    fields.map((f) => {
      let v = record?.data[f.name];
      if (f.name in (record?.data ?? {})) return [f.name, String(v ?? "")];
      if (record?.data[f.name + "_paisa"] !== undefined)
        return [f.name, decimal(Number(record.data[f.name + "_paisa"]))];
      if (f.name === "start") return [f.name, today().slice(0, 7)];
      if (f.name === "annual_rate") return [f.name, ""];
      if (f.name === "compounding") return [f.name, "monthly"];
      if (f.type === "date") return [f.name, today()];
      if (f.name === "day") return [f.name, "1"];
      if (f.name === "term") return [f.name, "12"];
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
