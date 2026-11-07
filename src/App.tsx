import { AccountTools } from "./AccountTools";
import { LoanCalculator } from "./LoanCalculator";
import { DateInput, dateText } from "./DateInput";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FinanceCharts } from "./FinanceCharts";
import { ConnectedAccounts } from "./ConnectedAccounts";
import { SavingsEstimate } from "./SavingsEstimate";
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
} from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  ArrowDownLeft,
  Landmark,
  CreditCard,
  CalendarDays,
  Sprout,
  Wallet,
  ChartNoAxesCombined,
  Target,
  Plus,
  Download,
  LogOut,
  Pencil,
  Trash2,
  Menu,
  RefreshCw,
  X,
  ArrowUpRight,
  UserRound,
} from "lucide-react";
import { api } from "./api";
import { AuthProvider, AuthPage, Callback, useAuth } from "./Auth";
import type {
  Kind,
  MoneyRecord,
  Snapshot,
  Transaction,
  TxInput,
  Due,
} from "./types";
import { money, decimal, today } from "./money";
import { kindLabels, kindSingular, categories } from "./forms";
import { EditorDialog, type Editor } from "./Editors";
const nav = [
  { path: "/", name: "Overview", icon: LayoutDashboard },
  { path: "/transactions", name: "Transactions", icon: ArrowLeftRight },
  { path: "/incomes", name: "Income sources", icon: ArrowDownLeft },
  { path: "/loans", name: "Loans & EMI", icon: Landmark },
  { path: "/cards", name: "Credit cards", icon: CreditCard },
  { path: "/planner", name: "Monthly planner", icon: CalendarDays },
  { path: "/savings", name: "Savings & investments", icon: Sprout },
  { path: "/accounts", name: "Accounts", icon: Wallet },
  { path: "/budgets", name: "Budgets", icon: Target },
  { path: "/reports", name: "Reports", icon: ChartNoAxesCombined },
];
const headings: Record<string, [string, string]> = Object.fromEntries([
  ["/", "Overview"], ["/transactions", "Transactions"], ["/incomes", "Income sources"],
  ["/loans", "Loans & EMI"], ["/cards", "Credit cards"], ["/planner", "Payment planner"],
  ["/savings", "Savings & investments"], ["/accounts", "Accounts"], ["/budgets", "Budgets"],
  ["/reports", "Reports"], ["/profile", "Profile"],
].map(([path, title]) => [path, [title, ""]]));
export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage register />} />
        <Route path="/auth/callback" element={<Callback />} />
        <Route path="/*" element={<Workspace />} />
      </Routes>
    </AuthProvider>
  );
}
function Workspace() {
  const { user, loading, setUser } = useAuth(),
    path = useLocation().pathname,
    [data, setData] = useState<Snapshot | null>(null),
    [date, setDate] = useState(today()),
    [period, setPeriod] = useState("Monthly"),
    [rangeFrom, setRangeFrom] = useState(today().slice(0,7) + "-01"),
    [rangeTo, setRangeTo] = useState(today()),
    [fetching, setFetching] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [editor, setEditor] = useState<Editor | null>(null),
    [menu, setMenu] = useState(false),
    [confirmDelete, setConfirmDelete] = useState<{
      kind: "records" | "transactions";
      id: string;
    } | null>(null),
    [deleting, setDeleting] = useState(false);
  const isProfile = path === "/profile";
  const fetchSequence = useRef(0);
  async function refresh() {
    const sequence = ++fetchSequence.current;
    if (period === "Custom" && (!rangeFrom || !rangeTo || rangeFrom > rangeTo)) { setFetching(false); return; }
    setFetching(true);
    try {
      const snapshot = await api<Snapshot>(
        `/finance?date=${date}&period=${period}${period === "Custom" ? `&from=${rangeFrom}&to=${rangeTo}` : ""}`,
      );
      if (sequence !== fetchSequence.current) return;
      setData(snapshot);
      setError("");
    } catch (e) {
      if (sequence === fetchSequence.current) setError((e as Error).message);
    } finally {
      if (sequence === fetchSequence.current) setFetching(false);
    }
  }
  useEffect(() => {
    if (user && !isProfile) void refresh();
  }, [user?.id, date, period, rangeFrom, rangeTo, isProfile]);
  useEffect(() => {
    setMenu(false);
    if (isProfile) setError("");
  }, [path]);
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(""), 5000);
      return () => clearTimeout(t);
    }
  }, [message]);
  if (loading) return <div className="loading">Opening your workspace…</div>;
  if (!user) return <Navigate to="/login" replace />;
  const title = headings[path] || headings["/"],
    record = (kind: Kind, r?: MoneyRecord) =>
      setEditor({ mode: "record", kind, record: r }),
    transaction = (defaults?: Partial<TxInput>, due?: Due, t?: Transaction) =>
      setEditor({ mode: "transaction", defaults, due, transaction: t }),
    remove = (kind: "records" | "transactions", id: string) =>
      setConfirmDelete({ kind, id }),
    paid = (due: Due) => {
      const r = data?.records.find((r) => r.id === due.record_id);
      transaction(
        {
          type: due.type,
          name: due.name,
          amount: decimal(due.left_paisa),
          account_id: String(r?.data.account_id || ""),
          loan_id: due.kind === "loans" ? due.record_id : undefined,
          saving_id: due.kind === "savings" ? due.record_id : undefined,
          card_id: due.kind === "cards" ? due.record_id : undefined,
        },
        due,
      );
    };
  const pageContent = () => {
    if (isProfile) return <ConnectedAccounts user={user} />;
    if (!data)
      return (
        <div className="empty">
          {fetching
            ? "Loading your finances…"
            : "Your data could not be loaded."}
          <button className="secondary" onClick={() => void refresh()}>
            Try again
          </button>
        </div>
      );
    const common = { data, record, transaction, remove, paid, date, refresh };
    if (path === "/") return <Overview {...common} />;
    if (path === "/transactions")
      return (
        <Transactions
          data={data}
          edit={(t) => transaction(undefined, undefined, t)}
          remove={(id) => remove("transactions", id)}
        />
      );
    if (path === "/planner") return <Planner {...common} />;
    if (path === "/reports") return <Reports data={data} />;
    let kind = path.slice(1) as Kind;
    if (kind === "budgets") return <Budgets {...common} />;
    if (["accounts", "incomes", "loans", "cards", "savings"].includes(kind))
      return <RecordPage {...common} kind={kind} />;
    return <Navigate to="/" replace />;
  };
  return (
    <div className="app">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <b>৳</b>HishabKhata<span>.</span>
        </div>
        <div className="tagline">EVERY PAISA HAS A PLACE</div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {nav.map(({ path, name, icon: Icon }) => (
            <NavLink key={path} to={path} end={path === "/"}>
              <Icon size={18} />
              {name}
            </NavLink>
          ))}
        </nav>
        <footer>
          <NavLink className="profile" to="/profile">
            <div className="avatar">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div>
              <b>{user.name}</b>
              <small>Personal workspace</small>
            </div>
          </NavLink>
          <button
            className="signout"
            onClick={async () => {
              try {
                await api("/auth/logout", "POST");
                setUser(null);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </footer>
      </aside>
      {menu && (
        <button
          className="sidebaroverlay"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <main>
        <header>
          <div className="crumb">
            <button
              className="mobile-menu iconbutton"
              aria-label="Toggle navigation"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={20} />
            </button>
            <span>
              My workspace <i>/</i>
              <b>{nav.find((n) => n.path === path)?.name || "Profile"}</b>
            </span>
          </div>
          {!isProfile && <div className="headright">
            <span className="pill">৳ BDT</span>
            <span className="timezone">Asia / Dhaka</span>
            <button
              className="iconbutton"
              aria-label="Refresh records"
              onClick={() => void refresh()}
            >
              <RefreshCw size={16} className={fetching ? "spin" : ""} />
            </button>
          </div>}
        </header>
        <div className="heading">
          <div>
            <h1>{title[0]}</h1>
            
          </div>
          {!isProfile && <button className="primary" onClick={() => transaction()}>
            <Plus size={16} /> Add transaction
          </button>}
        </div>
        {!isProfile && <div className="toolbar">
          <div className="segments">
            {["Daily", "Monthly", "Yearly", "Custom"].map((p) => (
              <button
                key={p}
                aria-pressed={p === period}
                className={p === period ? "active" : ""}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="reporttools">
            {period === "Custom" ? <div className="date-range">
              <label>From<DateInput label="From date" value={rangeFrom} onChange={setRangeFrom} /></label>
              <label>To<DateInput label="To date" value={rangeTo} onChange={setRangeTo} /></label>
            </div> : <DateInput label="Reporting date" value={date} required onChange={value => value && setDate(value)} />}
            <button
              className="secondary"
              disabled={!data || (period === "Custom" && (!rangeFrom || !rangeTo || rangeFrom > rangeTo))}
              onClick={() => data && exportCSV(data)}
            >
              <Download size={14} /> Export
            </button>
          </div>
        </div>}
        {error && (
          <div className="error banner" role="alert">
            {error}
          </div>
        )}
        {period === "Custom" && rangeFrom > rangeTo && <p role="alert" className="error">End date must be on or after start date.</p>}
        {pageContent()}

      </main>
      <nav className="mobile-tabs" aria-label="Main navigation">
        {([{path:"/",name:"Home",icon:LayoutDashboard},{path:"/transactions",name:"Activity",icon:ArrowLeftRight},{path:"/planner",name:"Planner",icon:CalendarDays},{path:"/savings",name:"Savings",icon:Sprout},{path:"/profile",name:"Profile",icon:UserRound}]).map(({path,name,icon:Icon})=><NavLink key={path} to={path} end={path==="/"}><Icon size={20}/><span>{name}</span></NavLink>)}
      </nav>
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
      {editor && data && (
        <EditorDialog
          key={
            editor.mode +
            (editor.mode === "record" ? editor.kind : "tx") +
            (editor.mode === "record"
              ? editor.record?.id
              : editor.transaction?.id)
          }
          editor={editor}
          data={data}
          close={() => setEditor(null)}
          saved={async () => {
            await refresh();
            setMessage("Saved to your workspace");
          }}
        />
      )}
      {confirmDelete && (
        <DeleteDialog
          busy={deleting}
          close={() => setConfirmDelete(null)}
          confirm={async () => {
            setDeleting(true);
            try {
              await api(
                "/" + confirmDelete.kind + "/" + confirmDelete.id,
                "DELETE",
              );
              setConfirmDelete(null);
              await refresh();
              setMessage("Record deleted");
            } catch (e) {
              setError((e as Error).message);
              setConfirmDelete(null);
            } finally {
              setDeleting(false);
            }
          }}
        />
      )}
    </div>
  );
}
function DeleteDialog({
  close,
  confirm,
  busy,
}: {
  close: () => void;
  confirm: () => Promise<void>;
  busy: boolean;
}) {
  return (
    <div className="modalbackdrop">
      <section
        className="confirmdialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
      >
        <h2 id="delete-title">Delete this record?</h2>
        <p>
          This removes the record from your database. Records with linked
          transactions are protected.
        </p>
        <div className="dialogfoot">
          <button className="secondary" disabled={busy} onClick={close}>
            Keep record
          </button>
          <button
            className="dangerbutton"
            disabled={busy}
            onClick={() => void confirm()}
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </section>
    </div>
  );
}
interface Shared {
  data: Snapshot;
  record: (k: Kind, r?: MoneyRecord) => void;
  transaction: (d?: Partial<TxInput>, due?: Due, t?: Transaction) => void;
  remove: (k: "records" | "transactions", id: string) => void;
  paid: (d: Due) => void;
  date: string;
}
const n = (r: MoneyRecord, k: string) => Number(r.data[k] || 0),
  s = (r: MoneyRecord, k: string) => String(r.data[k] || "");
function Stats({ items }: { items: [string, number, string][] }) {
  return (
    <div className="stats">
      {items.map(([label, amount, note], i) => (
        <section className="stat" key={label}>
          <label>
            {label}
            <span>{i === 0 ? "◈" : i === 1 ? "↙" : i === 2 ? "↗" : "◇"}</span>
          </label>
          <strong>{money(amount)}</strong>
          <small>{note}</small>
        </section>
      ))}
    </div>
  );
}
function Row({
  name,
  value,
  total = false,
}: {
  name: string;
  value: number;
  total?: boolean;
}) {
  return (
    <div className={"reportrow" + (total ? " total" : "")}>
      <span>{name}</span>
      <b>{money(value)}</b>
    </div>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
function dueStatus(d: Due) {
  if(d.previously_paid) return "Previously paid";
  return d.left_paisa === 0
    ? "Paid"
    : d.paid_paisa > 0
      ? "Part paid"
      : d.date < today()
        ? "Overdue"
        : "Upcoming";
}
function Badge({ children }: { children: ReactNode }) {
  return (
    <span
      className={
        "badge " +
        (children === "Overdue" ? "red" : ["Paid","Previously paid"].includes(String(children)) ? "green" : "")
      }
    >
      {children}
    </span>
  );
}
function DueList({ rows, paid }: { rows: Due[]; paid: (d: Due) => void }) {
  return (
    <>
      {rows.length ? (
        rows.map((d) => (
          <div className="dueitem" key={d.record_id + d.cycle}>
            <div>
              <strong>{d.name}</strong>
              <small>
                {dateText(d.date)} · {d.type.replaceAll("_", " ")}
              </small>
            </div>
            <div className="dueamount">
              <b>{money(d.left_paisa)}</b>
              <div>
                <Badge>{dueStatus(d)}</Badge>
                {d.left_paisa > 0 && (
                  <button className="textbutton" onClick={() => paid(d)}>
                    {d.type === "income" ? "Receive" : "Record payment"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      ) : (
        <Empty>All clear. No pending commitments here.</Empty>
      )}
    </>
  );
}
function Overview(p: Shared) {
  const { data, paid, record } = p,
    a = data.summary,
    pending = data.planner.filter(
      (d) => d.left_paisa > 0 && d.type !== "income",
    );
  return (
    <>
      <Stats
        items={[
          ["Cash & bank balance", a.cash_paisa, "Through " + dateText(data.to)],
          [
            "Income received",
            a.income_paisa,
            "Selected period",
          ],
          [
            "Total expenses",
            a.spending_paisa,
            "Including loan interest",
          ],
          [
            "Payments due",
            pending.reduce((s, d) => s + d.left_paisa, 0),
            "Including overdue payments",
          ],
        ]}
      />
      {data.records.length === 0 && (
        <section className="welcome card">
          <div>
            <div className="eyebrow">A FRESH START</div>
            <h2>Your workspace is ready.</h2>
            <p>
              Start with a money account and its opening balance. Then add your
              income, loans, and savings plans.
            </p>
          </div>
          <button className="primary" onClick={() => record("accounts")}>
            <Plus size={16} /> Add my first account
          </button>
        </section>
      )}
      <FinanceCharts data={data} />
      <div className="quick-actions" aria-label="Quick transactions">
        {([ ["expense", "Add expense", ArrowUpRight], ["income", "Add income", ArrowDownLeft], ["transfer", "Transfer", ArrowLeftRight], ["saving", "Save money", Sprout] ] as const).map(([type,label,Icon]) => <button key={type} onClick={()=>p.transaction({type})}><span><Icon size={21}/></span>{label}</button>)}
      </div>
      <div className="grid">
        <section className="card">
          <div className="cardtitle">
            <h2>Payments due</h2>
            <NavLink to="/planner">Open planner →</NavLink>
          </div>
          <p className="sub">
            Upcoming payments and earlier unpaid commitments
          </p>
          <DueList rows={pending.slice(0, 5)} paid={paid} />
        </section>
        <section className="card">
          <h2>Cash flow</h2>
          <p className="sub">
            {dateText(data.from)} – {dateText(data.to)}
          </p>
          <Row name="Income received" value={a.income_paisa} />
          <Row name="Total debt repayments" value={-a.debt_payments_paisa} />
          <Row name="Net savings contributions" value={-a.net_savings_paisa} />
          <Row name="Net cash movement" value={a.cash_movement_paisa} total />

        </section>
      </div>
      <div className="grid">
        <section className="card">
          <div className="cardtitle">
            <h2>Recent transactions</h2>
            <NavLink to="/transactions">View all →</NavLink>
          </div>
          <TxTable data={data} tx={periodTx(data).slice(0, 5)} />
        </section>
        <section className="card">
          <h2>Balances</h2>
          <Row name="Savings & investments" value={a.savings_paisa} />
          <Row name="Loan principal outstanding" value={a.loans_paisa} />
          <Row name="Credit card outstanding" value={a.cards_paisa} />
          <Row name="Net worth" value={a.net_worth_paisa} total />
          <div className="actionrow">
            <button className="soft" onClick={() => record("incomes")}>
              ＋ Add income
            </button>
            <button className="soft" onClick={() => record("loans")}>
              ＋ Add loan
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
const periodTx = (data: Snapshot) =>
  data.transactions.filter((t) => t.date >= data.from && t.date <= data.to);
const txLabels: Record<string, string> = {
  income: "Income",
  expense: "Expense",
  saving: "Savings contribution",
  savings_withdrawal: "Savings withdrawal",
  loan_payment: "Loan EMI",
  card_payment: "Card repayment",
  transfer: "Transfer",
  loan_received: "Loan received",
};
function TxTable({
  data,
  tx,
  edit,
  remove,
}: {
  data: Snapshot;
  tx: Transaction[];
  edit?: (t: Transaction) => void;
  remove?: (id: string) => void;
}) {
  const name = (id: string | null) =>
    data.records.find((r) => r.id === id)?.name || "—";
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>TRANSACTION</th>
            <th>TYPE / CATEGORY</th>
            <th>ACCOUNT</th>
            <th className="right">AMOUNT</th>
            {edit && <th>ACTIONS</th>}
          </tr>
        </thead>
        <tbody>
          {tx.map((t) => (
            <tr key={t.id}>
              <td>
                <div className="txname">
                  <span className="txicon">
                    {t.type === "income" ? (
                      <ArrowDownLeft size={15} />
                    ) : (
                      <ArrowUpRight size={15} />
                    )}
                  </span>
                  <div>
                    <b>{t.name || txLabels[t.type]}</b>
                    <small>
                      {dateText(t.date)}
                      {t.cycle ? " · " + t.cycle : ""}
                    </small>
                  </div>
                </div>
              </td>
              <td>
                <Badge>{txLabels[t.type]}</Badge>
                <small>{t.category}</small>
              </td>
              <td>
                {name(t.account_id)}
                {t.destination_id && <small>→ {name(t.destination_id)}</small>}
              </td>
              <td
                className={
                  "money " +
                  (["income", "loan_received", "savings_withdrawal"].includes(
                    t.type,
                  )
                    ? "positive"
                    : "")
                }
              >
                {["income", "loan_received", "savings_withdrawal"].includes(
                  t.type,
                )
                  ? "+"
                  : "−"}
                {money(t.amount_paisa)}
                {t.type === "transfer" && t.interest_paisa > 0 && <small>Fee {money(t.interest_paisa)}</small>}
              </td>
              {edit && (
                <td>
                  <div className="txActions">
                    <button
                      className="iconbutton"
                      aria-label={"Edit " + t.name}
                      onClick={() => edit(t)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="iconbutton danger"
                      aria-label={"Delete " + t.name}
                      onClick={() => remove?.(t.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
          {tx.length === 0 && (
            <tr>
              <td colSpan={5}>
                <Empty>No transactions for this period.</Empty>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function Transactions({
  data,
  edit,
  remove,
}: {
  data: Snapshot;
  edit: (t: Transaction) => void;
  remove: (id: string) => void;
}) {
  const [q, setQ] = useState(""),
    [type, setType] = useState("");
  const filtered = periodTx(data).filter(
    (t) =>
      (!type || t.type === type) &&
      (
        t.name +
        " " +
        t.category +
        " " +
        data.records.find((r) => r.id === t.account_id)?.name
      )
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <section className="card">
      <h2>Your transaction ledger</h2>
      <div className="filterrow">
        <input
          aria-label="Search transactions"
          placeholder="Search description, category, account…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          aria-label="Transaction type"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">All types</option>
          {Object.entries(txLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <p className="sub">
        {filtered.length} records · selected reporting period
      </p>
      <TxTable data={data} tx={filtered} edit={edit} remove={remove} />
    </section>
  );
}
function RecordPage(p: Shared & { kind: Kind; refresh: () => Promise<void> }) {
  const { data, kind, record, remove, transaction, paid } = p,
    records = data.records.filter((r) => r.kind === kind);
  return (
    <>
      <div className="sectiontools">
<h2>{kindLabels[kind]} <span className="record-count">{records.length}</span></h2>
        <div className="actionrow">
          {kind === "accounts" && (
            <button
              className="secondary"
              onClick={() =>
                transaction({ type: "transfer", name: "Account transfer" })
              }
            >
              ↔ Transfer
            </button>
          )}
          <button className="primary" onClick={() => record(kind)}>
            <Plus size={16} /> Add {kindSingular[kind]}
          </button>
        </div>
      </div>
      {kind === "loans" && <LoanCalculator />}
      <div className="listgrid">
        {records.map((r) => {
          const bal = data.balances[r.id] || 0,
            due = data.planner.find(
              (d) => d.record_id === r.id && d.left_paisa > 0,
            ),
            received = data.transactions
              .filter(
                (t) =>
                  t.source_id === r.id &&
                  t.date >= data.from && t.date <= data.to &&
                  t.type === "income",
              )
              .reduce((s, t) => s + t.amount_paisa, 0);
          return (
            <section className="card" key={r.id}>
              <div className="cardtop">
                <div>
                  <h2>{r.name}</h2>
                  <p className="sub">
                    {s(r, "type") || s(r, "bank") || kindLabels[kind]}
                    {s(r, "lender") ? " · " + s(r, "lender") : ""}
                  </p>
                </div>
                <Badge>
                  {kind === "loans" && bal === 0
                    ? "Paid"
                    : kind === "accounts" && r.data.archived === "yes" ? "Archived"
                    : due
                      ? dueStatus(due)
                      : kind === "cards"
                        ? "Up to date"
                        : s(r, "type") || "BDT"}
                </Badge>
              </div>
              <div className="bigamount">
                {money(kind === "incomes" ? n(r, "amount_paisa") : bal)}
              </div>
              <p className="sub">
                {kind === "accounts"
                  ? "Current balance"
                  : kind === "loans"
                    ? "Remaining principal"
                    : kind === "cards"
                      ? "Current outstanding"
                      : kind === "incomes"
                        ? "Expected each month"
                        : "Recorded savings balance"}
              </p>

              {kind === "loans" && (
                <>
                  <Progress
                    value={n(r, "opening_paisa") - bal}
                    max={n(r, "opening_paisa")}
                  />
                  <Details
                    items={[
                      ["Monthly EMI", money(n(r, "emi_paisa"))],
                      ["Processing fee", money(n(r, "processing_fee_paisa"))],
                      ["Annual interest rate", s(r, "rate") + "%"],
                      ["Due day", s(r, "day") + " each month"],
                      [
                        "First month / term",
                        s(r, "start") + " · " + s(r, "term") + " months",
                      ],
                    ]}
                  />
                </>
              )}
              {kind === "cards" && (
                <>
                  <Progress value={bal} max={n(r, "limit_paisa")} />
                  <Details
                    items={[
                      ["Credit limit", money(n(r, "limit_paisa"))],
                      [
                        "Available credit",
                        money(Math.max(0, n(r, "limit_paisa") - bal)),
                      ],
                      [
                        "Statement due",
                        money(
                          Math.max(
                            0,
                            n(r, "statement_paisa") -
                              data.transactions
                                .filter(
                                  (t) =>
                                    t.card_id === r.id &&
                                    t.type === "card_payment" &&
                                    t.statement_date === s(r, "statement_date"),
                                )
                                .reduce((s, t) => s + t.amount_paisa, 0),
                          ),
                        ),
                      ],
                      ["Minimum payment", money(n(r, "minimum_paisa"))],
                      ["Statement date", dateText(s(r, "statement_date"))],
                      ["Payment due", dateText(s(r, "due_date"))],
                    ]}
                  />
                </>
              )}
              {kind === "incomes" && (
                <Details
                  items={[
                    ...(s(r, "frequency") === "once" ? [["Receipt date", dateText(s(r,"payment_date"))]] as [string,string][] : [["Payment day",s(r,"day")],["First month",s(r,"start")],["Last month",s(r,"end") || "Ongoing"]] as [string,string][]),
                    ["Received in selected period", money(received)],
                  ]}
                />
              )}{" "}
              {kind === "savings" && (
                <>
                  <Progress value={bal} max={n(r, "target_paisa")} />
                  <Details
                    items={[
                      [s(r,"type") === "FDR" ? "Deposit amount" : s(r,"type") === "Goal" ? "Target amount" : "Planned contributions", money(n(r, "target_paisa"))],
                      ...(s(r,"type") === "FDR" ? [] : [[s(r,"type") === "SIP" ? "Monthly investment" : s(r,"type") === "DPS" ? "Monthly installment" : "Monthly saving",money(n(r,"monthly_paisa"))],["Payment day",s(r,"day")]] as [string,string][]),
                      ["Opening date", dateText(s(r,"opening_date")) || s(r,"start")],
                      [s(r,"type") === "Goal" ? "Target date" : "Maturity date", dateText(s(r, "maturity"))],
                      ["Tenure", s(r, "maturity_mode") === "duration" ? `${s(r, "term_value")} ${s(r, "term_unit")}` : "Exact date"],
                    ]}
                  />
                  <SavingsEstimate data={r.data} transactions={data.transactions} planId={r.id} balance={bal} />
                </>
              )}
              {kind === "accounts" && (
                <p className="sub">
                  Opening balance {money(n(r, "opening_paisa"))}
                </p>
              )}
              {kind === "accounts" && (
                <AccountTools account={r} data={data} refresh={p.refresh} />
              )}
              <div className="actionrow">
                {due && kind !== "cards" && (
                  <button className="soft" onClick={() => paid(due)}>
                    {kind === "incomes"
                      ? "Record income"
                      : kind === "loans"
                        ? "Record EMI"
                        : "Contribute"}
                  </button>
                )}
                {kind === "loans" && bal > 0 && (
                  <button
                    className="textbutton"
                    onClick={() =>
                      transaction({
                        type: "loan_payment",
                        loan_id: r.id,
                        name: r.name + " — extra payment",
                      })
                    }
                  >
                    Extra repayment
                  </button>
                )}
                {kind === "cards" && (
                  <>
                    <button
                      className="soft"
                      onClick={() =>
                        transaction({
                          type: "card_payment",
                          card_id: r.id,
                          name: r.name + " — repayment",
                          amount: due ? decimal(due.left_paisa) : undefined,
                        })
                      }
                    >
                      Record repayment
                    </button>
                    <button
                      className="textbutton"
                      onClick={() =>
                        transaction({
                          type: "expense",
                          account_id: r.id,
                          name: "Card purchase",
                        })
                      }
                    >
                      Add purchase
                    </button>
                  </>
                )}
                {kind === "savings" && (
                  <>
                    <button
                      className="textbutton"
                      onClick={() =>
                        transaction({
                          type: "saving",
                          saving_id: r.id,
                          name: r.name + " — contribution",
                        })
                      }
                    >
                      Add contribution
                    </button>
                    <button
                      className="textbutton"
                      onClick={() =>
                        transaction({
                          type: "savings_withdrawal",
                          saving_id: r.id,
                          name: r.name + " — withdrawal",
                        })
                      }
                    >
                      Withdraw
                    </button>
                  </>
                )}
                <button className="textbutton" onClick={() => record(kind, r)}>
                  {kind === "cards" ? "Edit / update statement" : "Edit"}
                </button>
                <button
                  className="textbutton danger"
                  onClick={() => remove("records", r.id)}
                >
                  Delete
                </button>
              </div>
            </section>
          );
        })}
      </div>
      {records.length === 0 && (
        <section className="card">
          <Empty>
            No {kindLabels[kind].toLowerCase()} yet.
            <br />
            Add your first {kindSingular[kind]} to get started.
          </Empty>
        </section>
      )}
      {kind === "cards" && (
        <p className="notice">
          Update your statement from your bank each cycle. A statement does not
          add debt again. Record purchases, interest, and fees as card expenses;
          repayments reduce your outstanding balance.
        </p>
      )}
    </>
  );
}
function Progress({ value, max }: { value: number; max: number }) {
  return (
    <div className="progress">
      <i
        style={{
          width:
            Math.min(100, Math.max(0, max ? (value / max) * 100 : 0)) + "%",
          background: value > max ? "#bd8069" : undefined,
        }}
      />
    </div>
  );
}
function Details({ items }: { items: [string, string][] }) {
  return (
    <div className="detailgrid">
      {items.map(([key, value]) => (
        <div key={key}>
          <span>{key}</span>
          {value}
        </div>
      ))}
    </div>
  );
}
function Planner(p: Shared) {
  const rows = p.data.planner,
    pending = rows.filter((d) => d.left_paisa > 0 && d.type !== "income"),
    income = rows.filter((d) => d.left_paisa > 0 && d.type === "income");
  return (
    <>
      <Stats
        items={[
          [
            "Remaining to pay",
            pending.reduce((s, d) => s + d.left_paisa, 0),
            "Includes earlier unpaid commitments",
          ],
          [
            "Expected income left",
            income.reduce((s, d) => s + d.left_paisa, 0),
            "Scheduled income not received",
          ],
          [
            "Overdue payments",
            pending
              .filter((d) => d.date < today())
              .reduce((s, d) => s + d.left_paisa, 0),
            "Due dates before today",
          ],
          [
            "Paid commitments",
            rows
              .filter(
                (d) =>
                  d.date >= p.data.from && d.date <= p.data.to && d.type !== "income",
              )
              .reduce((s, d) => s + d.paid_paisa, 0),
            "Selected period",
          ],
        ]}
      />
      <div className="grid">
        <section className="card">
          <div className="cardtitle">
            <h2>Payments & contributions</h2>
            <button className="textbutton" onClick={() => p.record("bills")}>
              ＋ Add recurring bill
            </button>
          </div>
          <DueList rows={pending} paid={p.paid} />
        </section>
        <section className="card">
          <h2>Money expected</h2>
          <DueList rows={income} paid={p.paid} />
          <h2 className="sectiongap">Completed in selected period</h2>
          <DueList
            rows={rows.filter(
              (d) =>
                !d.previously_paid && d.left_paisa === 0 && d.date >= p.data.from && d.date <= p.data.to,
            )}
            paid={p.paid}
          />
        </section>
      </div>
      <section className="card sectiongap">
        <div className="cardtitle">
          <h2>Recurring bills</h2>
          <button className="soft" onClick={() => p.record("bills")}>
            ＋ Add bill
          </button>
        </div>
        {p.data.records
          .filter((r) => r.kind === "bills")
          .map((r) => (
            <div className="dueitem" key={r.id}>
              <div>
                <strong>{r.name}</strong>
                <small>
                  {s(r, "category")} · day {s(r, "day")} · {s(r, "start")} →{" "}
                  {s(r, "end") || "ongoing"}
                </small>
              </div>
              <div>
                <b>{money(n(r, "amount_paisa"))}</b>
                <div className="actionrow">
                  <button
                    className="textbutton"
                    onClick={() => p.record("bills", r)}
                  >
                    Edit
                  </button>
                  <button
                    className="textbutton danger"
                    onClick={() => p.remove("records", r.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
      </section>
    </>
  );
}
function Budgets(p: Shared) {
  return (
    <section className="card">
      <div className="cardtitle">
        <h2>Monthly category limits</h2>
        <button className="primary" onClick={() => p.record("budgets")}>
          <Plus size={16} /> Set budget
        </button>
      </div>
      <p className="sub">
        Spending in {p.date.slice(0, 7)} · limits repeat each month
      </p>
      {p.data.records
        .filter((r) => r.kind === "budgets")
        .map((r) => {
          const spent = p.data.transactions
              .filter(
                (t) =>
                  t.type === "expense" &&
                  t.category === s(r, "category") &&
                  t.date.startsWith(p.date.slice(0, 7)),
              )
              .reduce((s, t) => s + t.amount_paisa, 0),
            limit = n(r, "limit_paisa");
          return (
            <div className="budget" key={r.id}>
              <div className="savinghead">
                <b>{s(r, "category")}</b>
                <span>
                  {money(spent)} / {money(limit)}
                </span>
              </div>
              <Progress value={spent} max={limit} />
              <div className="savingfoot">
                <span>
                  {spent > limit
                    ? "Over by " + money(spent - limit)
                    : money(limit - spent) + " remaining"}
                </span>
                <div>
                  <button
                    className="textbutton"
                    onClick={() => p.record("budgets", r)}
                  >
                    Edit
                  </button>
                  <button
                    className="textbutton danger"
                    onClick={() => p.remove("records", r.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      {!p.data.records.some((r) => r.kind === "budgets") && (
        <Empty>
          Give groceries, transport, shopping, and more a monthly limit.
        </Empty>
      )}
    </section>
  );
}
function Reports({ data }: { data: Snapshot }) {
  const a = data.summary,
    tx = periodTx(data),
    cardIds = data.records.filter((r) => r.kind === "cards").map((r) => r.id),
    cashExpenses = tx
      .filter((t) => t.type === "expense" && !cardIds.includes(t.account_id))
      .reduce((s, t) => s + t.amount_paisa, 0);
  return (
    <>
      <Stats
        items={[
          [
            "Net worth",
            a.net_worth_paisa,
            "Cash + savings − loans − card debt",
          ],
          [
            "Assets",
            a.cash_paisa + a.savings_paisa,
            "Cash, bank accounts, and savings",
          ],
          [
            "Liabilities",
            a.loans_paisa + a.cards_paisa,
            "Principal and card outstanding",
          ],
          [
            "Net savings movement",
            a.net_savings_paisa,
            "Contributions less withdrawals",
          ],
        ]}
      />
      <FinanceCharts data={data} />
      <div className="grid">
        <section className="card">
          <h2>Cash flow</h2>
          <p className="sub">
            {dateText(data.from)} – {dateText(data.to)}
          </p>
          <Row name="Income received" value={a.income_paisa} />
          <Row name="Cash / bank purchases" value={-cashExpenses} />
          <Row name="Transfer fees" value={-(a.transfer_fees_paisa ?? 0)} />
          <Row name="Loan & card repayments" value={-a.debt_payments_paisa} />
          <Row name="Net savings contributions" value={-a.net_savings_paisa} />
          <Row
            name="Loan proceeds received"
            value={tx
              .filter((t) => t.type === "loan_received")
              .reduce((s, t) => s + t.amount_paisa, 0)}
          />
          <Row name="Net cash movement" value={a.cash_movement_paisa} total />
        </section>
        <section className="card">
          <h2>Spending breakdown</h2>
          {categories
            .map((c) => ({
              c,
              v: tx
                .filter((t) => t.type === "expense" && t.category === c)
                .reduce((s, t) => s + t.amount_paisa, 0),
            }))
            .filter((x) => x.v)
            .sort((a, b) => b.v - a.v)
            .map((x) => (
              <Row key={x.c} name={x.c} value={x.v} />
            ))}
          <Row name="Loan interest paid" value={a.interest_paisa} />
          <Row name="Transfer fees" value={a.transfer_fees_paisa ?? 0} />
          <Row name="Total spending" value={a.spending_paisa} total />
        </section>
      </div>
      <div className="grid">
        <section className="card">
          <h2>Balance sheet</h2>
          <p className="sub">Through {dateText(data.to)}</p>
          <Row name="Cash & bank accounts" value={a.cash_paisa} />
          <Row name="Savings & investments" value={a.savings_paisa} />
          <Row name="Loan principal" value={-a.loans_paisa} />
          <Row name="Credit card debt" value={-a.cards_paisa} />
          <Row name="Net worth" value={a.net_worth_paisa} total />
        </section>
        <section className="card">
          <h2>Debt payments this period</h2>
          <Row
            name="Principal repaid"
            value={tx
              .filter((t) => t.type === "loan_payment")
              .reduce((s, t) => s + t.principal_paisa, 0)}
          />
          <Row name="Interest paid" value={a.interest_paisa} />
          <Row
            name="Credit card repayments"
            value={tx
              .filter((t) => t.type === "card_payment")
              .reduce((s, t) => s + t.amount_paisa, 0)}
          />
          <Row name="Total repayments" value={a.debt_payments_paisa} total />

        </section>
      </div>
    </>
  );
}
function exportCSV(data: Snapshot) {
  const safe = (v: unknown) => {
      let s = String(v ?? "");
      if (/^[=+\-@]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    },
    rows = periodTx(data).map((t) => [
      dateText(t.date),
      t.name,
      t.type,
      t.category,
      data.records.find((r) => r.id === t.account_id)?.name,
      decimal(t.amount_paisa),
      decimal(t.principal_paisa),
      decimal(t.type === "loan_payment" ? t.interest_paisa : 0),
      decimal(t.type === "transfer" ? t.interest_paisa : 0),
    ]);
  const url = URL.createObjectURL(
    new Blob(
      [
        "Date,Description,Type,Category,Account,Amount BDT,Principal BDT,Interest BDT,Transfer fee BDT\n" +
          rows.map((r) => r.map(safe).join(",")).join("\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `hishabkhata-${data.from}-to-${data.to}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
