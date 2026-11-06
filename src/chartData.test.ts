import {describe,it,expect} from "vitest";
import {chartData} from "./chartData";
import type {Transaction} from "./types";
const tx=(type:string,date:string,amount:number,extra={})=>({type,date,amount_paisa:amount,interest_paisa:0,...extra} as Transaction);
describe("finance charts",()=>{
 it("includes both range boundaries and counts expenses once",()=>{
  const result=chartData([tx("income","2026-10-31",100),tx("income","2026-11-01",12345),tx("expense","2026-11-30",10,{category:"Food"}),tx("card_payment","2026-11-10",1000),tx("loan_payment","2026-11-15",2000,{interest_paisa:200}),tx("expense","2026-12-01",500)],"2026-11-01","2026-11-30");
  expect(result.total).toBe(210);expect(result.buckets.reduce((s,b)=>s+b.income,0)).toBe(12345);expect(result.buckets.reduce((s,b)=>s+b.expense,0)).toBe(210);
 });
 it("supports a single day and no transactions",()=>{const r=chartData([],"2026-11-07","2026-11-07");expect(r.buckets).toHaveLength(1);expect(r.total).toBe(0);expect(r.slices).toEqual([]);});
 it("groups multi-year ranges into at most twelve periods",()=>{const r=chartData([tx("expense","2028-02-29",10)],"2020-01-01","2029-12-31");expect(r.buckets.length).toBeLessThanOrEqual(12);expect(r.total).toBe(10);expect(r.buckets.reduce((s,b)=>s+b.expense,0)).toBe(10);});
 it("combines small categories without losing paisa",()=>{const r=chartData(Array.from({length:9},(_,i)=>tx("expense","2026-11-07",i+1,{category:`Category ${i}`})),"2026-11-07","2026-11-07");expect(r.slices).toHaveLength(6);expect(r.slices.reduce((s,c)=>s+c.value,0)).toBe(45);});
});
