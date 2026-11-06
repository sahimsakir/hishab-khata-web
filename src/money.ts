export function parseMoney(value: string): number {
  if (!/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(value))
    throw new Error(
      "Enter a valid BDT amount with at most two decimal places.",
    );
  const [whole, part = ""] = value.split(".");
  return Number(whole) * 100 + Number(part.padEnd(2, "0"));
}
export function decimal(paisa: number): string {
  const sign = paisa < 0 ? "-" : "";
  const n = Math.abs(paisa);
  return `${sign}${Math.floor(n / 100)}.${String(n % 100).padStart(2, "0")}`;
}
export const money = (n: number) =>
  "৳" +
  (n / 100).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
