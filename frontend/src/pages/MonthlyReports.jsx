import { useEffect, useMemo, useState } from "react";
import PageQuote from "../components/PageQuote";
import {
  loadLiveState,
  recordBillSettlement,
  executeDayClosing,
} from "../utils/liveCafeStore";

function formatInr(amount) {
  const num = Number(amount || 0);
  return "\u20B9" + num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function MonthlyReport() {
  const [live, setLive] = useState(() => loadLiveState());
  const [billAmount, setBillAmount] = useState("");
  const [payMode, setPayMode] = useState("Cash");
  const [slideIdx, setSlideIdx] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const sync = (e) => {
      setLive(e?.detail ? { ...e.detail } : loadLiveState());
    };
    window.addEventListener("cafe-live-update", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cafe-live-update", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const totalCollected = Number(live?.totalCollected || 0);
  const completedOrders = Number(live?.completedOrders || 0);
  const breakdown = live?.paymentBreakdown || {};

  const cashTotal = Number(breakdown.Cash ?? breakdown.cash ?? 0);
  const upiTotal = Number(breakdown.UPI ?? breakdown.upi ?? 0);
  const cardTotal = Number(breakdown.Card ?? breakdown.card ?? 0);

  const monthlyRevenue = Number(live?.monthRevenue ?? totalCollected);
  const baseExpenses = Number(live?.monthExpenses ?? 0);
  const staffSalary = Number(live?.staffSalaryTotal ?? 0);
  const totalExpenses = baseExpenses + staffSalary;
  const netProfit = monthlyRevenue - totalExpenses;

  const vendorDues = Number(live?.vendorDue ?? 0);
  const vendorCount = Number(live?.vendorCount ?? 0);
  const paidVendors = Number(live?.paidVendors ?? 0);
  const pendingVendors = Number(live?.pendingVendors ?? 0);

  const recentBills = useMemo(() => {
    return Array.isArray(live?.recentBills) ? live.recentBills : [];
  }, [live]);

  const safeReserveStatus = useMemo(() => {
    if (totalCollected === 0 && completedOrders === 0) return "Idle";
    return cashTotal >= 0 ? "Balanced" : "Check Cash";
  }, [totalCollected, completedOrders, cashTotal]);

  const handleSettlePrint = (e) => {
    e.preventDefault();
    const amt = Number(billAmount);
    if (!amt || amt <= 0) {
      setNotice("Enter valid amount greater than \u20B90.");
      return;
    }
    const next = recordBillSettlement({ amount: amt, mode: payMode });
    setLive({ ...next });
    setBillAmount("");
    setNotice("Settled " + formatInr(amt) + " (" + payMode + ").");
  };

  const handleDayClosing = () => {
    const next = executeDayClosing();
    setLive({ ...next });
    setNotice("Day Closing executed.");
  };

  const handleDownloadPdf = () => {
    const content = [
      "CAFE CRAFT - MONTHLY & LIVE FINANCIAL REPORT",
      "Generated: " + new Date().toLocaleString("en-IN"),
      "--------------------------------------------------",
      "Today Collected: " + formatInr(totalCollected) + " (" + completedOrders + " orders)",
      "Cash: " + formatInr(cashTotal) + " | UPI: " + formatInr(upiTotal) + " | Card: " + formatInr(cardTotal),
      "--------------------------------------------------",
      "Monthly Revenue: " + formatInr(monthlyRevenue),
      "Direct Expenses: " + formatInr(baseExpenses),
      "Staff Salary: " + formatInr(staffSalary),
      "Total Expenses: " + formatInr(totalExpenses),
      "Net Profit: " + formatInr(netProfit),
      "Vendor Dues: " + formatInr(vendorDues) + " (" + vendorCount + " Vendors)",
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cafe-craft-monthly-report-" + new Date().toISOString().slice(0, 10) + ".txt";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Monthly report downloaded.");
  };

  const duePercent =
    monthlyRevenue > 0
      ? Math.min(100, Math.max(0, Math.round((vendorDues / monthlyRevenue) * 100)))
      : vendorDues > 0
      ? 100
      : 0;

  return (
    <div className="w-full space-y-6 text-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Billing &amp; Reports
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-200 mt-0.5">
            Real-time financial settlement and report tracking
          </p>
        </div>
        {notice && (
          <span className="text-xs font-bold text-amber-200 bg-black/35 border border-amber-300/30 px-3.5 py-1.5 rounded-full">
            {notice}
          </span>
        )}
      </div>

      {/* 3-Column Transparent Glass Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Bill Settlement */}
        <div className="rounded-3xl bg-white/10 backdrop-blur-[2px] border border-white/25 p-6 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-extrabold text-white">Bill Settlement</h2>
              <span className="w-2.5 h-2.5 rounded-full bg-white/10 backdrop-blur-[2px]" />
            </div>

            <form onSubmit={handleSettlePrint} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  New Settlement
                </label>
                <div className="flex items-center rounded-2xl bg-white/15 border border-white/25 px-3.5 py-2.5">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    placeholder="Enter Amount"
                    className="w-full bg-transparent text-sm font-semibold text-white placeholder:text-slate-200 focus:outline-none"
                  />
                  <span className="text-xs font-extrabold text-amber-300 ml-2">
                    {billAmount ? formatInr(billAmount) : "\u20B90.00"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 items-stretch">
                {["Cash", "UPI", "Card"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPayMode(mode)}
                    className={
                      "rounded-2xl py-2.5 px-2 text-xs font-extrabold border transition cursor-pointer flex flex-col items-center justify-center gap-1 " +
                      (payMode === mode
                        ? "bg-white/10 backdrop-blur-[2px] text-slate-950 border-[#f5b427]"
                        : "bg-white/10 text-white border-white/20 hover:bg-white/15")
                    }
                  >
                    <span>{mode}</span>
                  </button>
                ))}

                <button
                  type="submit"
                  className="rounded-2xl bg-white/10 backdrop-blur-[2px] hover:bg-white/10 backdrop-blur-[2px] text-slate-950 font-extrabold text-xs px-2 py-2.5 leading-tight shadow-md transition cursor-pointer"
                >
                  Settle &amp; Print Bill
                </button>
              </div>
            </form>

            <div className="mt-5">
              <div className="text-xs font-bold text-slate-200 mb-2">Recent Bills</div>
              {recentBills.length === 0 ? (
                <div className="rounded-2xl bg-white/10 border border-white/15 px-3.5 py-3 text-xs font-semibold text-slate-200">
                  No live bills settled yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {recentBills.slice(0, 6).map((b) => (
                    <div
                      key={b.id}
                      className="rounded-2xl bg-white/10 border border-white/20 px-3.5 py-2.5 flex items-center justify-between text-xs font-bold"
                    >
                      <span className="text-slate-200">{b.mode || "Cash"}</span>
                      <span className="text-white font-extrabold">{formatInr(b.amount)}</span>
                      <span className="rounded-lg bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 px-2 py-0.5 text-[11px]">
                        {b.status || "Paid"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Day Closing */}
        <div className="rounded-3xl bg-white/10 backdrop-blur-[2px] border border-white/25 p-6 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-extrabold text-white">Day Closing</h2>
              <span className="w-2.5 h-2.5 rounded-full bg-white/10 backdrop-blur-[2px]" />
            </div>

            <div className="text-xs font-bold text-slate-200">Total Collected</div>
            <div className="mt-1 text-3xl sm:text-4xl font-black text-[#f5b427]">
              {formatInr(totalCollected)}
            </div>
            <div className="mt-1 text-xs font-bold text-slate-200">
              Completed Orders: <span className="text-white">{completedOrders}</span>
            </div>

            <div className="mt-5 space-y-2.5">
              <div className="rounded-2xl bg-white/10 border border-white/20 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-bold">
                <span className="text-slate-100">Cash:</span>
                <span className="text-white font-extrabold">{formatInr(cashTotal)}</span>
              </div>

              <div className="rounded-2xl bg-white/10 border border-white/20 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-bold">
                <span className="text-slate-100">UPI:</span>
                <span className="text-white font-extrabold">{formatInr(upiTotal)}</span>
              </div>

              <div className="rounded-2xl bg-white/10 border border-white/20 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-bold">
                <span className="text-slate-100">Card:</span>
                <span className="text-white font-extrabold">{formatInr(cardTotal)}</span>
              </div>

              <div className="rounded-2xl bg-white/10 border border-white/20 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-bold">
                <span className="text-slate-100">Safe Cash Reserve</span>
                <span className="text-emerald-300 font-extrabold">{safeReserveStatus}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDayClosing}
            className="mt-6 w-full rounded-2xl bg-white/10 backdrop-blur-[2px] hover:bg-white/10 backdrop-blur-[2px] text-slate-950 font-extrabold text-sm sm:text-base py-3 shadow-md transition cursor-pointer"
          >
            Execute Day Closing
          </button>
        </div>

        {/* Card 3: Monthly Report */}
        <div className="rounded-3xl bg-white/10 backdrop-blur-[2px] border border-white/25 p-6 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-extrabold text-white">Monthly Report</h2>
              <span className="text-xs font-bold text-amber-300">Live Synced</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="rounded-2xl bg-white/10 border border-white/20 p-3">
                <div className="text-[11px] font-bold text-slate-200">Revenue</div>
                <div className="mt-1.5 text-xs sm:text-sm font-black text-white">
                  {formatInr(monthlyRevenue)}
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 border border-white/20 p-3">
                <div className="text-[11px] font-bold text-slate-200">Expenses</div>
                <div className="mt-1.5 text-xs sm:text-sm font-black text-amber-300">
                  {formatInr(totalExpenses)}
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 border border-white/20 p-3">
                <div className="text-[11px] font-bold text-slate-200">Net Profit</div>
                <div className="mt-1.5 text-xs sm:text-sm font-black text-emerald-300">
                  {formatInr(netProfit)}
                </div>
              </div>
            </div>

            <div className="mt-2.5 text-[11px] font-semibold text-slate-200 text-center">
              Includes Direct Expense ({formatInr(baseExpenses)}) + Staff Salary ({formatInr(staffSalary)})
            </div>

            {/* Dots */}
            <div className="mt-3.5 flex items-center justify-center gap-2">
              {[0, 1, 2].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSlideIdx(d)}
                  aria-label={"Report slide " + (d + 1)}
                  className={
                    "h-2 rounded-full transition cursor-pointer " +
                    (slideIdx === d ? "w-5 bg-white/10 backdrop-blur-[2px]" : "w-2 bg-white/35")
                  }
                />
              ))}
            </div>

            {/* Vendor Dues */}
            <div className="mt-5 pt-4 border-t border-white/15">
              <div className="text-xs sm:text-sm font-extrabold text-white">
                Vendor Dues &amp; Pending Payments
              </div>

              <div className="mt-3 h-2 w-full rounded-full bg-white/15 overflow-hidden">
                <div
                  style={{ width: String(duePercent) + "%" }}
                  className="h-full rounded-full bg-white/10 backdrop-blur-[2px] transition-all duration-300"
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs font-extrabold">
                <span className="text-amber-300">Due: {formatInr(vendorDues)}</span>
                <span className="text-white">{formatInr(vendorDues)}</span>
              </div>

              <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-slate-200">
                <span>Vendors: {vendorCount}</span>
                <span>
                  Paid: {paidVendors} | {pendingVendors} Pending
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="mt-6 w-full rounded-2xl bg-white/10 backdrop-blur-[2px] hover:bg-white/10 backdrop-blur-[2px] text-slate-950 font-extrabold text-sm sm:text-base py-3 shadow-md transition cursor-pointer"
          >
            Download PDF Report
          </button>
        </div>
      </div>

      <PageQuote page="reports" />
    </div>
  );
}