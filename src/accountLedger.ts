import { decimal, parseMoney } from "./money";
import type { Transaction } from "./types";

export function accountMovement(t: Transaction, account: string) {
  if (t.destination_id === account && t.type === "transfer") return t.amount_paisa;
  if (t.account_id !== account) return 0;
  if (["income", "loan_received", "savings_withdrawal"].includes(t.type)) return t.amount_paisa;
  return -t.amount_paisa - (t.type === "transfer" ? t.interest_paisa : 0);
}

export function parseStatement(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [], value = "", quoted = false;
  const source = csv.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"') {
      if (quoted && source[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (ch === "," || ch === "\n")) {
      row.push(value.trim());
      value = "";
      if (ch === "\n") { if (row.some(Boolean)) rows.push(row); row = []; }
    } else value += ch;
  }
  if (quoted) throw Error("The CSV contains an unclosed quote.");
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  const header = rows.shift()?.map(column => column.toLowerCase()) ?? [];
  const dateIndex = header.indexOf("date");
  const description = header.indexOf("description");
  const amount = header.indexOf("amount");
  const debit = header.indexOf("debit"), credit = header.indexOf("credit");
  if (dateIndex < 0 || (amount < 0 && (debit < 0 || credit < 0))) throw Error("Use Date and Amount columns, or Date, Debit and Credit. Description is optional.");
  if (!rows.length || rows.length > 500) throw Error("Upload between 1 and 500 transactions per file.");

  return rows.map((row, index) => {
    try {
      const date = (row[dateIndex] || "").replace(/^(\d\d)-(\d\d)-(\d{4})$/, "$3-$2-$1");
      const parsed = new Date(date + "T00:00:00Z");
      if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw Error("Invalid date");
      const read = (text: string) => parseMoney(text.trim().replaceAll(",", "").replace(/^\+/, "") || "0");
      let movement;
      if (amount >= 0) {
        const signed = row[amount] || "";
        movement = read(signed.replace(/^-/, "")) * (signed.startsWith("-") ? -1 : 1);
      } else {
        const out = read(row[debit] || ""), incoming = read(row[credit] || "");
        if (out && incoming) throw Error("Use either debit or credit");
        movement = incoming - out;
      }
      if (!movement) throw Error("Amount must be nonzero");
      const name = row[description] || "";
      if (name.length > 120) throw Error("Description exceeds 120 characters");
      return { date, name, movement, amount: decimal(Math.abs(movement)) };
    } catch (error) {
      throw Error(`CSV row ${index + 2}: ${(error as Error).message}`);
    }
  });
}

export async function importKey(account: string, signature: string, occurrence: number) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify([account, signature, occurrence])));
  const hex = Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`;
}
