import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { api } from "./api";
import {
  recordFields,
  recordValues,
  notes,
  kindSingular,
  categories,
  type Field,
} from "./forms";
import { decimal, today, parseMoney } from "./money";
import type {
  Kind,
  MoneyRecord,
  Snapshot,
  Transaction,
  TxInput,
  TxType,
  Due,
} from "./types";
export type Editor =
  | { mode: "record"; kind: Kind; record?: MoneyRecord }
  | {
      mode: "transaction";
      transaction?: Transaction;
      defaults?: Partial<TxInput>;
      due?: Due;
    };
function FieldInput({ f, defaultValue }: { f: Field; defaultValue?: string }) {
  return (
    <label>
      {f.label}
      {f.options ? (
        <select
          name={f.name}
          required={f.required}
          defaultValue={defaultValue}
          aria-label={f.label}
        >
          {!f.required && <option value="">None</option>}
          {f.options.length === 0 && <option value="">Create one first</option>}
          {f.options.map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={f.name}
          type={f.type || "text"}
          required={f.required}
          defaultValue={defaultValue}
          min={f.min}
          max={f.max}
          step={f.step}
          maxLength={f.type ? undefined : 120}
        />
      )}
    </label>
  );
}
export function EditorDialog({
  editor,
  data,
  close,
  saved,
}: {
  editor: Editor;
  data: Snapshot;
  close: () => void;
  saved: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
    const onCancel = (e: Event) => {
      e.preventDefault();
      close();
    };
    dialog.current?.addEventListener("cancel", onCancel);
    return () => dialog.current?.removeEventListener("cancel", onCancel);
  }, []);
  return (
    <dialog ref={dialog}>
      <div className="modaltop">
        <h2>
          {editor.mode === "record"
            ? (editor.record ? "Edit " : "Add ") + kindSingular[editor.kind]
            : editor.transaction
              ? "Edit transaction"
              : editor.due
                ? "Record " +
                  (editor.due.type === "income" ? "income received" : "payment")
                : "Add transaction"}
        </h2>
        <button
          type="button"
          className="iconbutton"
          aria-label="Close dialog"
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      {editor.mode === "record" ? (
        <>
          <p className="note">{notes[editor.kind]}</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setBusy(true);
              try {
                const values = Object.fromEntries(
                  new FormData(e.currentTarget),
                ) as Record<string, string>;
                const name = values.name;
                delete values.name;
                await api(
                  "/records" + (editor.record ? "/" + editor.record.id : ""),
                  editor.record ? "PUT" : "POST",
                  { kind: editor.kind, name, data: values },
                );
                await saved();
                close();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="formgrid">
              <label>
                Name
                <input
                  name="name"
                  required
                  maxLength={120}
                  defaultValue={editor.record?.name}
                />
              </label>
              {recordFields(editor.kind, data.records).map((f) => (
                <FieldInput
                  key={f.name}
                  f={f}
                  defaultValue={
                    recordValues(
                      editor.record,
                      recordFields(editor.kind, data.records),
                    )[f.name]
                  }
                />
              ))}
            </div>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <div className="dialogfoot">
              <button type="button" className="secondary" onClick={close}>
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </>
      ) : (
        <TransactionForm
          editor={editor}
          data={data}
          close={close}
          saved={saved}
        />
      )}
    </dialog>
  );
}
const typeOptions: [TxType, string][] = [
  ["expense", "Expense / card purchase"],
  ["income", "Income received"],
  ["loan_payment", "Loan EMI / repayment"],
  ["card_payment", "Credit card repayment"],
  ["saving", "Savings contribution"],
  ["savings_withdrawal", "Savings withdrawal"],
  ["transfer", "Account transfer"],
  ["loan_received", "Loan proceeds received"],
];
function TransactionForm({
  editor,
  data,
  close,
  saved,
}: {
  editor: Extract<Editor, { mode: "transaction" }>;
  data: Snapshot;
  close: () => void;
  saved: () => Promise<void>;
}) {
  const t = editor.transaction,
    defaults = editor.defaults ?? {},
    [type, setType] = useState<TxType>(
      t?.type || defaults.type || editor.due?.type || "expense",
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [key] = useState(t?.idempotency_key ?? crypto.randomUUID());
  const options = (kind: Kind) =>
    data.records
      .filter((r) => r.kind === kind)
      .map((r) => [r.id, r.name] as [string, string]);
  const fields: Field[] = [
    { name: "name", label: "Description", required: true },
    {
      name: "amount",
      label: "Amount (৳)",
      type: "number",
      min: "0.01",
      max: "9999999999.99",
      step: "0.01",
      required: true,
    },
    { name: "date", label: "Transaction date", type: "date", required: true },
    {
      name: "account_id",
      label:
        type === "income" ||
        type === "loan_received" ||
        type === "savings_withdrawal"
          ? "Receive into"
          : "Pay from",
      options: [
        ...options("accounts"),
        ...(type === "expense" ? options("cards") : []),
      ],
      required: true,
    },
  ];
  if (["income", "expense"].includes(type))
    fields.push({
      name: "category",
      label: "Category",
      options: categories.map((s) => [s, s]),
      required: true,
    });
  if (type === "transfer")
    fields.push({
      name: "destination_id",
      label: "Destination account",
      options: options("accounts"),
      required: true,
    });
  if (["saving", "savings_withdrawal"].includes(type))
    fields.push({
      name: "saving_id",
      label: "Savings plan",
      options: options("savings"),
      required: true,
    });
  if (type === "loan_payment")
    fields.push(
      {
        name: "loan_id",
        label: "Loan",
        options: options("loans"),
        required: true,
      },
      {
        name: "principal",
        label: "Principal portion (৳)",
        type: "number",
        min: "0",
        step: "0.01",
        required: true,
      },
    );
  if (type === "card_payment")
    fields.push({
      name: "card_id",
      label: "Credit card",
      options: options("cards"),
      required: true,
    });
  const values: Record<string, string> = {
    name: t?.name || defaults.name || editor.due?.name || "",
    amount: t
      ? decimal(t.amount_paisa)
      : defaults.amount || (editor.due && decimal(editor.due.left_paisa)) || "",
    date: t?.date || today(),
    account_id:
      t?.account_id || defaults.account_id || options("accounts")[0]?.[0] || "",
    category: t?.category || "Other",
    destination_id: t?.destination_id || "",
    loan_id: t?.loan_id || defaults.loan_id || "",
    saving_id: t?.saving_id || defaults.saving_id || "",
    card_id: t?.card_id || defaults.card_id || "",
    principal: t ? decimal(t.principal_paisa) : "",
  };
  return (
    <>
      <p className="note">
        {editor.due
          ? `Linked to ${editor.due.cycle}. Partial payments are supported.`
          : type === "loan_payment"
            ? "Enter the actual principal amount from your lender. Payment minus principal is recorded as interest."
            : "This records money movement in your ledger. It does not execute a bank transfer."}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setBusy(true);
          try {
            const v = Object.fromEntries(
              new FormData(e.currentTarget),
            ) as Record<string, string>;
            parseMoney(v.amount);
            const body: TxInput = {
              ...v,
              type,
              name: v.name,
              date: v.date,
              amount: v.amount,
              account_id: v.account_id,
              idempotency_key: key,
            };
            if (editor.due && type !== "card_payment") {
              body.source_id = editor.due.record_id;
              body.cycle = editor.due.cycle;
            }
            if (t && t.type === type) {
              body.source_id = t.source_id || undefined;
              body.cycle = t.cycle || undefined;
              body.statement_date = t.statement_date || undefined;
            }
            await api(
              "/transactions" + (t ? "/" + t.id : ""),
              t ? "PUT" : "POST",
              body,
            );
            await saved();
            close();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Transaction type
          <select
            value={type}
            disabled={!!editor.due}
            onChange={(e) => setType(e.target.value as TxType)}
          >
            {typeOptions.map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div className="formgrid" key={type}>
          {fields.map((f) => (
            <FieldInput
              key={f.name}
              f={f}
              defaultValue={values[f.name] || f.options?.[0]?.[0] || ""}
            />
          ))}
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="dialogfoot">
          <button type="button" className="secondary" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save transaction"}
          </button>
        </div>
      </form>
    </>
  );
}
