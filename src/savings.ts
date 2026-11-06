import { parseMoney } from "./money";
import type { Data, Transaction } from "./types";

export const growthMethods = [
  ["simple", "Simple interest / no reinvestment"],
  ["monthly", "Compound monthly"],
  ["quarterly", "Compound quarterly"],
  ["yearly", "Compound yearly"],
] as [string, string][];

export interface SavingsProjection {
  principal: number;
  gain: number;
  maturity: number;
  returnPercent: number;
  contributions: number;
  annualRate: number;
}

function date(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error("Invalid date");
  const t = Date.parse(value + "T00:00:00Z");
  if (!Number.isFinite(t) || new Date(t).toISOString().slice(0, 10) !== value) throw Error("Invalid date");
  return t;
}

/** Indicative nominal-rate projection, Actual/365, rounded once to paisa. */
export function projectSavings(data: Data, transactions: readonly Transaction[] = [], planId?: string): SavingsProjection | null {
  try {
    if (data.annual_rate === undefined || data.annual_rate === null || data.annual_rate === "") return null;
    const rate = Number(data.annual_rate);
    const method = String(data.compounding ?? "monthly");
    if (!Number.isFinite(rate) || rate < (data.type === "SIP" ? -99.99 : 0) || rate > 100 ||
        !growthMethods.some(([key]) => key === method)) return null;
    const start = date(String(data.projection_start ?? ""));
    const end = date(String(data.maturity ?? ""));
    const years = (end - start) / 86400000 / 365;
    if (years < 0 || years > 100) return null;
    const paisa = (key: string) => data[key + "_paisa"] !== undefined
      ? Number(data[key + "_paisa"]) : parseMoney(String(data[key] ?? ""));
    const historicalMovement = planId ? transactions.filter(t => t.saving_id === planId &&
      date(t.date) < start).reduce((sum, t) => sum + (t.type === "saving" ? t.amount_paisa :
        t.type === "savings_withdrawal" ? -t.amount_paisa : 0), 0) : 0;
    const opening = paisa("opening") + historicalMovement, monthly = paisa("monthly");
    if (![opening, monthly].every(n => Number.isSafeInteger(n) && n >= 0)) return null;
    // FDR principal is the planned lump sum; opening balance is not added again.
    const initial = data.type === "FDR" ? paisa("target") : opening;
    if (data.type === "FDR" && monthly !== 0) return null;
    const frequency = method === "monthly" ? 12 : method === "quarterly" ? 4 : 1;
    const factor = (days: number) => method === "simple"
      ? 1 + rate / 100 * days / 365
      : Math.pow(1 + rate / 100 / frequency, frequency * days / 365);
    let principal = initial, value = initial * factor((end - start) / 86400000), count = 0;
    const first = String(data.start ?? "");
    const day = Number(data.day);
    if (!/^\d{4}-\d{2}$/.test(first) || !Number.isInteger(day) || day < 1 || day > 31) return null;
    const [year, month] = first.split("-").map(Number);
    if (month < 1 || month > 12 || year < 1000) return null;
    let cursor = Math.max(year * 12 + month - 1, new Date(start).getUTCFullYear() * 12 + new Date(start).getUTCMonth());
    for (let i = 0; monthly > 0 && i <= 1200; i++, cursor++) {
      const y = Math.floor(cursor / 12), m = cursor % 12;
      const due = Date.UTC(y, m, Math.min(day, new Date(Date.UTC(y, m + 1, 0)).getUTCDate()));
      if (due > end || (data.maturity_mode === "duration" && due === end) || (data.end && `${y}-${String(m + 1).padStart(2, "0")}` > String(data.end))) break;
      // Opening balance includes everything before projection start; same-day deposits are included.
      if (due < start) continue;
      principal += monthly;
      value += monthly * factor((end - due) / 86400000);
      count++;
    }
    const maturity = Math.round(value);
    if (!Number.isSafeInteger(maturity) || maturity < 0 || !Number.isSafeInteger(principal) || principal <= 0) return null;
    const gain = maturity - principal;
    return { principal, gain, maturity, returnPercent: gain / principal * 100, contributions: count, annualRate: rate };
  } catch { return null; }
}
