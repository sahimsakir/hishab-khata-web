import { expect, it } from "vitest";
import { accountMovement, parseStatement } from "./accountLedger";
import type { Transaction } from "./types";

it("imports quoted statement descriptions and signed amounts in paisa", () => {
  expect(parseStatement('Date,Description,Amount\r\n07-11-2026,"Wallet, cash out","-1,000.25"')).toEqual([
    { date: "2026-11-07", name: "Wallet, cash out", movement: -100025, amount: "1000.25" },
  ]);
  expect(parseStatement("Date,Debit,Credit\n2026-11-07,,42")[0].movement).toBe(4200);
  expect(() => parseStatement("Date,Amount\n31-02-2026,1")).toThrow("Invalid date");
});

it("subtracts a transfer fee only from the paying account", () => {
  const t = { type: "transfer", account_id: "bank", destination_id: "wallet", amount_paisa: 100000, interest_paisa: 525 } as Transaction;
  expect(accountMovement(t, "bank")).toBe(-100525);
  expect(accountMovement(t, "wallet")).toBe(100000);
});
