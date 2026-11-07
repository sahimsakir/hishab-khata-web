import { useState } from "react";
import { api } from "./api";
import { DateInput, dateText } from "./DateInput";
import { money, parseMoney, decimal, today } from "./money";
import { accountMovement, importKey, parseStatement } from "./accountLedger";
import type { MoneyRecord, Reconciliation, Snapshot } from "./types";

type ImportRow = ReturnType<typeof parseStatement>[number] & { key: string; duplicate: boolean; selected: boolean };

export function AccountTools({ account, data, refresh }: { account: MoneyRecord; data: Snapshot; refresh: () => Promise<void> }) {
  const saved = account.data.reconciliation as Reconciliation | undefined;
  const [date, setDate] = useState(saved?.date || today());
  const [closing, setClosing] = useState(saved?.balance ?? decimal(data.balances[account.id] ?? 0));
  const [cleared, setCleared] = useState(saved?.cleared ?? []);
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const archived = account.data.archived === "yes";
  const opening = Number(account.data.opening_paisa ?? 0);
  let running = opening;
  const ledger = [...data.transactions].reverse().flatMap(transaction => {
    const movement = accountMovement(transaction, account.id);
    if (!movement) return [];
    running += movement;
    return [{ transaction, movement, running }];
  });
  const statementRows = ledger.filter(row => row.transaction.date <= date);
  const checked = new Set(cleared);
  const clearedBalance = opening + statementRows.reduce((sum, row) => sum + (checked.has(row.transaction.id) ? row.movement : 0), 0);
  let closingPaisa: number | undefined;
  try {
    if (closing !== "") closingPaisa = parseMoney(closing.replace(/^-/, "")) * (closing.startsWith("-") ? -1 : 1);
  } catch { /* The save action requires a valid closing balance. */ }

  async function updateAccount(extra: Record<string, unknown>) {
    await api("/accounts/" + account.id + "/settings", "PATCH", extra);
  }

  async function perform(action: () => Promise<string>) {
    setBusy(true); setError(""); setMessage("");
    try { setMessage(await action()); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); await refresh(); }
  }

  async function loadStatement(file: File) {
    setBusy(true); setError(""); setMessage(""); setPreview([]);
    try {
      if (file.size > 1024 * 1024) throw Error("The CSV must be under 1 MB.");
      const seen = new Map<string, number>();
      const existing = new Set(ledger.map(row => JSON.stringify([row.transaction.date, row.movement])));
      const keys = new Set(data.transactions.map(t => t.idempotency_key));
      const rows = await Promise.all(parseStatement(await file.text()).map(async row => {
        const signature = JSON.stringify([row.date, row.movement, row.name]);
        const count = seen.get(signature) ?? 0;
        seen.set(signature, count + 1);
        const key = await importKey(account.id, signature, count);
        const duplicate = keys.has(key) || existing.has(JSON.stringify([row.date, row.movement])) || count > 0;
        return { ...row, key, duplicate, selected: !duplicate };
      }));
      setPreview(rows);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function importRows() {
    let imported = 0;
    try {
      const selected = preview.filter(row => row.selected);
      for (let offset = 0; offset < selected.length; offset += 25) {
        const batch = selected.slice(offset, offset + 25);
        await api("/transactions/import", "POST", { rows: batch.map(row => ({
          type: row.movement > 0 ? "income" : "expense",
          name: row.name, date: row.date, amount: row.amount, category: "Other",
          account_id: account.id, idempotency_key: row.key,
        })) });
        imported += batch.length;
        const keys = new Set(batch.map(row => row.key));
        setPreview(previous => previous.filter(item => !keys.has(item.key)));
      }
    } catch (e) {
      throw Error(`${imported} rows saved. ${(e as Error).message}`);
    }
    return `${imported} transactions imported.`;
  }

  return <div className="account-tools">
    <details>
      <summary>Account ledger</summary>
      <div className="table-wrap"><table>
        <thead><tr><th>Date</th><th>Transaction</th><th>Change</th><th>Balance</th></tr></thead>
        <tbody>
          <tr><td>Opening</td><td></td><td></td><td>{money(opening)}</td></tr>
          {ledger.map(({ transaction: t, movement, running }) => <tr key={t.id}>
            <td>{dateText(t.date)}</td><td>{t.name || t.type.replaceAll("_", " ")}</td><td>{money(movement)}</td><td>{money(running)}</td>
          </tr>)}
        </tbody>
      </table></div>
    </details>
    <details>
      <summary>Reconcile statement</summary>
      <form onSubmit={e => {
        e.preventDefault();
        if (!date || closingPaisa === undefined) return;
        void perform(async () => {
          await updateAccount({ reconciliation: { date, balance: closing, cleared: statementRows.filter(row => checked.has(row.transaction.id)).map(row => row.transaction.id) } });
          return "Reconciliation saved.";
        });
      }}>
        <label>Statement date<DateInput label="Statement date" value={date} onChange={setDate} required /></label>
        <label>Statement closing balance (৳)<input type="number" step="0.01" required value={closing} onChange={e => setClosing(e.target.value)} /></label>
        <p>Cleared balance {money(clearedBalance)} · Difference {closingPaisa === undefined ? "—" : money(closingPaisa - clearedBalance)}</p>
        <div className="table-wrap"><table><thead><tr><th>Cleared</th><th>Date</th><th>Transaction</th><th>Change</th></tr></thead>
          <tbody>{statementRows.map(({ transaction: t, movement }) => <tr key={t.id}>
            <td><input type="checkbox" aria-label={`Cleared: ${t.name || t.type}, ${dateText(t.date)}, ${money(movement)}`} checked={checked.has(t.id)}
              onChange={e => setCleared(e.target.checked ? [...cleared, t.id] : cleared.filter(id => id !== t.id))} /></td>
            <td>{dateText(t.date)}</td><td>{t.name || t.type}</td><td>{money(movement)}</td>
          </tr>)}</tbody>
        </table></div>
        <button className="secondary" disabled={busy || !date || closingPaisa === undefined}>Save reconciliation</button>
      </form>
    </details>
    {!archived && <details>
      <summary>Import statement CSV</summary>
      <label>Statement file<input type="file" accept=".csv,text/csv" disabled={busy} onChange={e => {
        const file = e.target.files?.[0];
        if (file) void loadStatement(file);
        e.target.value = "";
      }} /></label>
      <p className="sub">Date, Description, Amount. Use negative amounts for debits, or separate Debit and Credit columns.</p>
      {preview.length > 0 && <>
        <div className="table-wrap"><table><thead><tr><th>Import</th><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
          <tbody>{preview.map(row => <tr key={row.key}>
            <td><input type="checkbox" aria-label={`Import ${row.name || dateText(row.date)}`} disabled={busy} checked={row.selected} onChange={e => setPreview(previous => previous.map(item => item.key === row.key ? {...item,selected:e.target.checked} : item))} /></td>
            <td>{dateText(row.date)}</td><td>{row.name || "—"}{row.duplicate && <small> · Possible duplicate</small>}</td><td>{money(row.movement)}</td>
          </tr>)}</tbody>
        </table></div>
        <button className="primary" disabled={busy || !preview.some(row => row.selected)} onClick={() => void perform(importRows)}>Import selected</button>
      </>}
    </details>}
    <button className="textbutton" disabled={busy} onClick={() => void perform(async () => {
      await updateAccount({ archived: archived ? "no" : "yes" });
      return archived ? "Account restored." : "Account archived.";
    })}>{archived ? "Restore account" : "Archive account"}</button>
    {error && <p role="alert" className="error">{error}</p>}
    {message && <p role="status" className="sub">{message}</p>}
  </div>;
}
