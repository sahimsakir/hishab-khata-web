import type { Data } from "./types";

export function savingsStartDate(data: Data): string | null {
  if (data.opening_date) {
    const value = String(data.opening_date);
    const t = Date.parse(value + "T00:00:00Z");
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(t) && new Date(t).toISOString().slice(0,10) === value ? value : null;
  }
  if (!/^\d{4}-\d{2}$/.test(String(data.start))) return null;
  const [year, month] = String(data.start).split("-").map(Number);
  const day = Number(data.day);
  if (year < 1000 || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(day, new Date(Date.UTC(year, month, 0)).getUTCDate())).padStart(2, "0")}`;
}

export function calculateMaturity(data: Data): string | null {
  const start = savingsStartDate(data);
  const value = Number(data.term_value);
  if (!start || !Number.isInteger(value) || value < 1 || !["months", "years"].includes(String(data.term_unit))) return null;
  const months = value * (data.term_unit === "years" ? 12 : 1);
  if (months > 1200) return null;
  const [year, month, day] = start.split("-").map(Number);
  const destination = year * 12 + month - 1 + months;
  const y = Math.floor(destination / 12), m = destination % 12;
  if (y > 9999) return null;
  const d = Math.min(day, new Date(Date.UTC(y, m + 1, 0)).getUTCDate());
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function updateMaturity(data: Record<string, string>): Record<string, string> {
  return data.maturity_mode === "duration" ? { ...data, maturity: calculateMaturity(data) ?? "" } : data;
}

export function investmentMonths(data: Data): number | null {
  const start = savingsStartDate(data);
  const end = String(data.maturity ?? "");
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return null;
  const [y,m] = start.split("-").map(Number), [ey,em] = end.split("-").map(Number);
  const months = (ey-y)*12+em-m;
  if (months < 1 || months > 1200) return null;
  return calculateMaturity({...data,term_value:months,term_unit:"months"}) === end ? months : null;
}
