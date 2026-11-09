import { bonusTypes } from "./forms";
import { LoanEstimate } from "./LoanCalculator";
import { DateInput } from "./DateInput";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { SavingsEstimate } from "./SavingsEstimate";
import { InstallmentHistory } from "./InstallmentHistory";
import { changeRecordField, recordDraft } from "./recordDraft";
import { api } from "./api";
import {
  recordFields,
  recordFieldGroups,
  recordValues,
  kindSingular,
  categories,
  type Field,
} from "./forms";
import { decimal, today, parseMoney, money } from "./money";
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
function FieldInput({ f, defaultValue, value, onChange, readOnly }: { f: Field; defaultValue?: string; value?: string; onChange?: (value: string) => void; readOnly?: boolean }) {
  return (
    <label>
      {f.label}
      {f.options ? (
        <select
          name={f.name}
          required={f.required}
          defaultValue={value === undefined ? defaultValue : undefined}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
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
      ) : f.type === "date" ? (
        <DateInput name={f.name} label={f.label} value={value} defaultValue={defaultValue} onChange={onChange} required={f.required} readOnly={readOnly} />
      ) : (
        <input
          name={f.name}
          type={f.type || "text"}
          required={f.required}
          defaultValue={value === undefined ? defaultValue : undefined}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          readOnly={readOnly}
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
  const [projection, setProjection] = useState<Record<string, string>>(() =>
    editor.mode === "record" ? recordDraft(editor.kind,data.records,editor.record) : {});
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

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setBusy(true);
              try {
                const formValues = Object.fromEntries(
                  new FormData(e.currentTarget),
                ) as Record<string, string>;
                const values = editor.kind === "savings" ? {...projection,name:formValues.name} : formValues;
                if(editor.kind === "loans" && projection.type === "Family / friend" && projection.interest_bearing !== "yes") values.rate="0";
                for (const key of ["emi", "processing_fee", "bank_accrued_interest"]) {
                  if (values[key] === "") delete values[key];
                }
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
            </div>
            {recordFieldGroups(editor.kind,data.records,projection).map(group => <section className="record-form-section" key={group.title || "details"} aria-label={group.title || "Record details"}>
              {group.title && <h3>{group.title}</h3>}
              <div className="formgrid">
              {group.fields.map((f) => (
                <FieldInput
                  key={f.name}
                  f={editor.kind === "savings" && f.name === "term_value" ? { ...f, max: projection.term_unit === "years" ? "100" : "1200" } : f}
                  value={projection[f.name] ?? ""}
                  onChange={value => setProjection(previous => changeRecordField(editor.kind,data.records,previous,f.name,value))}
                  readOnly={editor.kind === "savings" && f.name === "maturity" && projection.maturity_mode === "duration"}
                  defaultValue={
                    recordValues(
                      editor.record,
                      recordFields(editor.kind, data.records),
                    )[f.name]
                  }
                />
              ))}
              </div>

              {["Interest calculation","Return calculation"].includes(group.title) && <SavingsEstimate data={projection} transactions={data.transactions} planId={editor.record?.id} />}
              {editor.kind === "loans" && group.title === "Repayment schedule" && (
                <LoanEstimate principal={projection.opening} rate={projection.type === "Family / friend" && projection.interest_bearing !== "yes" ? "0" : projection.rate ?? ""}
                  months={Number(projection.term)} fee={projection.processing_fee ?? ""} />
              )}
              {group.title === "Payment history" && <InstallmentHistory kind={editor.kind} values={projection} transactions={data.transactions} recordId={editor.record?.id} useCount={count=>setProjection(previous=>changeRecordField(editor.kind,data.records,previous,"previously_paid_installments",String(count)))} />}
            </section>)}

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
  ["expense", "Expense"],
  ["income", "Income received"],
  ["loan_payment", "Loan repayment"],
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
      .filter((r) => r.kind === kind && (r.data.archived !== "yes" || r.id === t?.account_id || r.id === t?.destination_id))
      .map((r) => [r.id, r.name] as [string, string]);
  const accountOptions = options("accounts");
  const initialAccount = t?.account_id || defaults.account_id || accountOptions[0]?.[0] || "";
  const [sourceId, setSourceId] = useState(initialAccount);
  const [destinationId, setDestinationId] = useState(t?.destination_id || defaults.destination_id || "");
  const transferSource = accountOptions.some(([id]) => id === sourceId)
    ? sourceId
    : accountOptions[0]?.[0] || "";
  const destinationOptions = accountOptions.filter(([id]) => id !== transferSource);
  const paymentOptions = type === "expense" ? [...accountOptions, ...options("cards")] : accountOptions;
  const selectedAccountId = paymentOptions.some(([id]) => id === sourceId)
    ? sourceId
    : paymentOptions[0]?.[0] || "";
  const selectedAccount = data.records.find(record => record.id === selectedAccountId);
  const accountBalance = data.balances[selectedAccountId];

  const fields: Field[] = [
    { name: "name", label: "Description (optional)" },
    {
      name: "amount",
      label: ({income:"Income amount",expense:"Expense amount",loan_payment:"Repayment amount",card_payment:"Payment amount",saving:"Contribution amount",savings_withdrawal:"Withdrawal amount",transfer:"Transfer amount",loan_received:"Disbursement amount"}[type]) + " (৳)",
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
          ? "Receiving account"
          : type === "transfer" ? "Source account" : "Payment account",
      options: paymentOptions,
      required: true,
    },
  ];
  if (["income", "expense"].includes(type))
    fields.push({
      name: "category",
      label: "Category",
      options: (type === "income" ? ["Salary","Business","Freelance","Rental income","Investment return",...bonusTypes,"Other"] : categories.filter(c=>!["Salary","Freelance","Savings"].includes(c))).map((s) => [s, s]),
      required: true,
    });
  if (type === "transfer")
    fields.push({name:"transfer_fee", label:"Transfer fee (৳)", type:"number", min:"0", step:"0.01"}, {
      name: "destination_id",
      label: "Destination account",
      options: [
        ["", destinationOptions.length ? "Select destination account" : "No other account available"],
        ...destinationOptions,
      ],
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
  const [savingId, setSavingId] = useState(t?.saving_id || defaults.saving_id || options("savings")[0]?.[0] || "");
  const selectedSaving = data.records.find(r=>r.id===savingId && r.kind==="savings");
  const scheduledSaving = type === "saving" && Number(selectedSaving?.data.monthly_paisa || 0) > 0;
  const values: Record<string, string> = {
    name: t?.name || defaults.name || editor.due?.name || "",
    amount: t
      ? decimal(t.amount_paisa)
      : defaults.amount || (editor.due && decimal(editor.due.left_paisa)) || "",
    date: t?.date || today(),
    account_id: initialAccount,
    category: t?.category || defaults.category || "Other",
    transfer_fee: t?.type === "transfer" ? decimal(t.interest_paisa) : "",
    loan_id: t?.loan_id || defaults.loan_id || "",
    saving_id: t?.saving_id || defaults.saving_id || "",
    card_id: t?.card_id || defaults.card_id || "",
    principal: t ? decimal(t.principal_paisa) : "",
  };
  return (
    <>

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
            if (type === "saving") {
              if (scheduledSaving) {
                body.source_id = v.saving_id;
                body.cycle = v.installment_month;
              } else {
                delete body.source_id;
                delete body.cycle;
              }
            }
            delete (body as unknown as Record<string,unknown>).installment_month;
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
          {fields.map((f) => {
            if (f.name === "account_id") {
              return <div key={f.name}>
                <FieldInput f={f} value={selectedAccountId} onChange={(id) => {
                  setSourceId(id);
                  if (id === destinationId) setDestinationId("");
                }} />
                {accountBalance !== undefined && (
                  <p className="sub" aria-live="polite">
                    {selectedAccount?.kind === "cards" ? "Outstanding balance" : "Current balance"}: <strong>{money(accountBalance)}</strong>
                  </p>
                )}
              </div>;
            }
            if (type === "transfer" && f.name === "destination_id") {
              const value = destinationOptions.some(([id]) => id === destinationId) ? destinationId : "";
              return <FieldInput key={f.name} f={f} value={value} onChange={setDestinationId} />;
            }
            return (
            <FieldInput
              key={f.name}
              f={f}
              value={f.name === "saving_id" ? savingId : undefined}
              onChange={f.name === "saving_id" ? setSavingId : undefined}
              defaultValue={values[f.name] || f.options?.[0]?.[0] || ""}
            />
            );
          })}
        </div>
        {scheduledSaving && <label key={savingId}>Installment month
          <input name="installment_month" type="month" required defaultValue={editor.due?.cycle || t?.cycle || (t?.date || today()).slice(0,7)} min={String(selectedSaving?.data.start || "")} max={String(selectedSaving?.data.maturity || "").slice(0,7)} />
        </label>}
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
