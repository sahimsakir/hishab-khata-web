export type Kind =
  "accounts" | "incomes" | "loans" | "cards" | "savings" | "bills" | "budgets";
export type TxType =
  | "income"
  | "expense"
  | "saving"
  | "savings_withdrawal"
  | "loan_payment"
  | "card_payment"
  | "transfer"
  | "loan_received";
export type Data = Record<string, string | number | null>;
export interface MoneyRecord {
  id: string;
  kind: Kind;
  name: string;
  data: Data;
}
export interface Transaction {
  id: string;
  type: TxType;
  name: string;
  category: string | null;
  date: string;
  amount_paisa: number;
  principal_paisa: number;
  interest_paisa: number;
  account_id: string;
  destination_id: string | null;
  loan_id: string | null;
  card_id: string | null;
  saving_id: string | null;
  source_id: string | null;
  cycle: string | null;
  statement_date: string | null;
  idempotency_key: string;
}
export interface Due {
  previously_paid?: boolean;
  record_id: string;
  kind: Kind;
  type: TxType;
  name: string;
  cycle: string;
  date: string;
  amount_paisa: number;
  paid_paisa: number;
  left_paisa: number;
}
export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
}
export interface Snapshot {
  records: MoneyRecord[];
  transactions: Transaction[];
  balances: Record<string, number>;
  planner: Due[];
  summary: Record<string, number>;
  from: string;
  to: string;
}
export interface TxInput {
  type: TxType;
  name: string;
  date: string;
  amount: string;
  principal?: string;
  category?: string;
  account_id: string;
  destination_id?: string;
  saving_id?: string;
  loan_id?: string;
  card_id?: string;
  source_id?: string;
  cycle?: string;
  statement_date?: string;
  idempotency_key: string;
}
