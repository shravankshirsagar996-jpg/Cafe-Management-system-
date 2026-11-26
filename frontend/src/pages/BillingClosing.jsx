import { useEffect, useMemo, useRef, useState } from "react";
import PageQuote from "../components/PageQuote";
import {
  loadLiveState,
  recordBillSettlement,
  recordExpenseEntry,
  addVendorEntry,
  saveLiveState,
  executeDayClosing,
} from "../utils/liveCafeStore";

function formatInr(amount) {
  const num = Number(amount || 0);
  return "\u20B9" + num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function PayMethodIcon({ mode }) {
  if (mode === "cash") {
    return (
      <svg className="w-4 h-4 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    );
  }
  if (mode === "upi") {
    return (
      <svg className="w-4 h-4 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 17L17 7" />
        <path d="M9 7h8v8" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

export default function BillingClosing() {
  const [live, setLive] = useState(() => loadLiveState());
  const [amountInput, setAmountInput] = useState("");
  const [expenseInput, setExpenseInput] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [reportSlide, setReportSlide] = useState(0);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [vendorName, setVendorName] = useState("");
  const [vendorCategory, setVendorCategory] = useState("Dairy & Milk");
  const [vendorDueInput, setVendorDueInput] = useState("");

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [monthArchives, setMonthArchives] = useState(() => {
    try {
      const raw = localStorage.getItem("cafe_craft_deleted_month_archives_v1");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  });

  const dropdownRef = useRef(null);

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

  useEffect(() => {
    const onOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setModeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  const totalCollected = Number(live?.totalCollected || 0);
  const completedOrders = Number(live?.completedOrders || 0);
  const breakdown = live?.paymentBreakdown || {};

  const cashTotal = Number(breakdown.Cash ?? breakdown.cash ?? live?.cashCollected ?? 0);
  const upiTotal = Number(breakdown.UPI ?? breakdown.upi ?? live?.upiCollected ?? 0);
  const cardTotal = Number(breakdown.Card ?? breakdown.card ?? live?.cardCollected ?? 0);

  const monthlySales = Number(live?.monthRevenue ?? live?.monthlySales ?? totalCollected);
  const monthlyExpenses = Number(live?.monthExpenses ?? live?.monthlyExpenses ?? live?.totalExpenses ?? 0);
  const netProfit = monthlySales - monthlyExpenses;
  const vendorDues = Number(live?.vendorDue ?? live?.vendorDues ?? live?.pendingVendorDues ?? 0);
  const vendorCount = Number(live?.vendorCount ?? 0);

  const recentBills = useMemo(() => {
    return Array.isArray(live?.recentBills) ? live.recentBills : [];
  }, [live]);

  const safeCashStatus = useMemo(() => {
    if (totalCollected === 0 && completedOrders === 0) return "Idle";
    return cashTotal >= 0 ? "Balanced" : "Check Cash";
  }, [totalCollected, completedOrders, cashTotal]);

  const monthOptions = useMemo(() => {
    const set = new Set([currentMonthKey]);
    monthArchives.forEach((a) => {
      if (a && a.monthKey) set.add(a.monthKey);
    });
    return Array.from(set).sort().reverse();
  }, [currentMonthKey, monthArchives]);

  const persistArchives = (list) => {
    setMonthArchives(list);
    try {
      localStorage.setItem("cafe_craft_deleted_month_archives_v1", JSON.stringify(list));
    } catch (_) {}
  };

  const handleSettleSubmit = (e) => {
    e.preventDefault();
    const numericAmount = Number(amountInput);
    if (!numericAmount || numericAmount <= 0) {
      setNotice("Enter a valid bill amount greater than \u20B90.");
      return;
    }
    setBusy(true);
    try {
      const updated = recordBillSettlement({
        amount: numericAmount,
        mode: paymentMode,
      });
      setLive({ ...updated });
      setAmountInput("");
      setNotice("Settled " + formatInr(numericAmount) + " via " + paymentMode.toUpperCase() + ".");
    } finally {
      setBusy(false);
    }
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    const numericExpense = Number(expenseInput);
    if (!numericExpense || numericExpense <= 0) {
      setNotice("Enter a valid expense amount greater than \u20B90.");
      return;
    }
    setBusy(true);
    try {
      const updated = recordExpenseEntry(numericExpense, numericExpense);
      setLive({ ...updated });
      setExpenseInput("");
      setNotice("Recorded expense " + formatInr(numericExpense) + ".");
    } finally {
      setBusy(false);
    }
  };

  const handleAddVendorDue = (e) => {
    e.preventDefault();
    const numericDue = Number(vendorDueInput);
    if (!numericDue || numericDue <= 0) {
      setNotice("Enter a valid vendor due amount greater than \u20B90.");
      return;
    }
    setBusy(true);
    try {
      const updated = addVendorEntry({
        name: vendorName.trim() || vendorCategory,
        category: vendorCategory,
        due: numericDue,
      });
      setLive({ ...updated });
      setVendorName("");
      setVendorDueInput("");
      setNotice("Added " + formatInr(numericDue) + " due under " + vendorCategory + ".");
    } finally {
      setBusy(false);
    }
  };

  const handleClearVendorDues = () => {
    const curr = loadLiveState();
    const next = saveLiveState({
      ...curr,
      vendorDue: 0,
      pendingVendors: 0,
      paidVendors: Number(curr.vendorCount || 0),
    });
    setLive({ ...next });
    setNotice("All vendor dues marked as settled.");
  };

  const handleDeleteAndArchiveMonth = () => {
    const targetMonth = selectedMonth || currentMonthKey;
    const snapSales = monthlySales;
    const snapExpenses = monthlyExpenses;
    const snapProfit = netProfit;
    const snapBills = Array.isArray(live?.recentBills) ? live.recentBills.length : 0;

    const archiveEntry = {
      id: Date.now(),
      monthKey: targetMonth,
      deletedAt: new Date().toLocaleString("en-IN"),
      sales: snapSales,
      expenses: snapExpenses,
      profit: snapProfit,
      billsCount: snapBills,
      snapshotState: { ...live },
    };

    const nextArchives = [archiveEntry, ...monthArchives].slice(0, 24);
    persistArchives(nextArchives);

    const clearedLive = saveLiveState({
      ...live,
      monthRevenue: 0,
      monthExpenses: 0,
      todayExpenses: 0,
      totalCollected: 0,
      completedOrders: 0,
      paymentBreakdown: { Cash: 0, UPI: 0, Card: 0 },
      recentBills: [],
    });
    setLive({ ...clearedLive });
    setNotice("Deleted " + targetMonth + " data and saved backup archive.");
  };

  const handleRestoreArchivedMonth = (entry) => {
    if (!entry || !entry.snapshotState) return;
    const restored = saveLiveState({
      ...entry.snapshotState,
    });
    setLive({ ...restored });
    setNotice("Restored archived data for " + entry.monthKey + ".");
  };

  const handleDayClosing = () => {
    setBusy(true);
    try {
      const updated = executeDayClosing();
      setLive({ ...updated });
      setNotice("Day Closing executed. Daily counters reset to \u20B90 for next shift.");
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadPdfReport = () => {
    const reportLines = [
      "CAFE CRAFT - REAL-TIME BILLING & CLOSING REPORT",
      "Generated At: " + new Date().toLocaleString("en-IN"),
      "--------------------------------------------------",
      "Total Collected Today: " + formatInr(totalCollected),
      "Completed Orders Today: " + completedOrders,
      "Cash: " + formatInr(cashTotal),
      "UPI: " + formatInr(upiTotal),
      "Card: " + formatInr(cardTotal),
      "Safe Cash Reserve: " + safeCashStatus,
      "--------------------------------------------------",
      "Monthly Sales: " + formatInr(monthlySales),
      "Total Expenses: " + formatInr(monthlyExpenses),
      "Net Profit: " + formatInr(netProfit),
      "Vendor Dues: " + formatInr(vendorDues) + " (" + vendorCount + " Vendors)",
    ].join("\n");

    const blob = new Blob([reportLines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cafe-craft-closing-report-" + new Date().toISOString().slice(0, 10) + ".txt";
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Real-time report downloaded.");
  };

  const dueProgressPct =
    monthlySales > 0 ? Math.min(100, Math.max(0, Math.round((vendorDues / monthlySales) * 100))) : 0;

  return (
    <div className="w-full space-y-6">
      <div className="relative z-40 rounded-3xl bg-white/10 backdrop-blur-[2px] border border-white/25 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-xl text-white">
        <form onSubmit={handleSettleSubmit} className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-extrabold text-white whitespace-nowrap">
            Quick Bill Settlement:
          </span>
          <input
            type="number"
            min="1"
            step="any"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder="Enter amount (&#8377;)"
            className="w-40 sm:w-44 rounded-xl bg-white/20 border border-white/30 px-3.5 py-2 text-sm font-semibold text-white placeholder:text-slate-200 focus:outline-none focus:border-[#f5b427]"
          />

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setModeMenuOpen((prev) => !prev)}
              className="w-24 rounded-xl bg-white/10 backdrop-blur-[2px] hover:bg-white/10 backdrop-blur-[2px] border border-white/25 px-3 py-2 text-sm font-bold text-white flex items-center justify-between gap-1.5 transition cursor-pointer"
            >
              <span>
                {paymentMode === "cash" ? "Cash" : paymentMode === "upi" ? "UPI" : "Card"}
              </span>
              <svg className="w-4 h-4 text-[#f5b427]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {modeMenuOpen && (
              <div className="absolute left-0 bottom-full mb-2 w-32 rounded-xl bg-white/10 backdrop-blur-[2px] border border-amber-400/40 py-1 shadow-2xl z-50">
                {[
                  { id: "cash", label: "Cash" },
                  { id: "upi", label: "UPI" },
                  { id: "card", label: "Card" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setPaymentMode(opt.id);
                      setModeMenuOpen(false);
                    }}
                    className={
                      "w-full px-3.5 py-2 text-left text-sm font-bold flex items-center justify-between transition cursor-pointer " +
                      (paymentMode === opt.id
                        ? "bg-white/10 backdrop-blur-[2px] text-slate-950"
                        : "text-white hover:bg-white/10")
                    }
                  >
                    <span>{opt.label}</span>
                    {paymentMode === opt.id && <span>&#10003;</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-white/10 backdrop-blur-[2px] hover:bg-white/10 backdrop-blur-[2px] text-slate-950 font-extrabold text-sm px-4 py-2 shadow-sm transition cursor-pointer disabled:opacity-60"
          >
            Settle Bill
          </button>
        </form>

        <form onSubmit={handleAddExpense} className="flex flex-wrap items-center gap-2.5">
          <span className="text-sm font-extrabold text-amber-300 whitespace-nowrap">
            Expense:
          </span>
          <input
            type="number"
            min="1"
            step="any"
            value={expenseInput}
            onChange={(e) => setExpenseInput(e.target.value)}
            placeholder="Expense (&#8377;)"
            className="w-32 sm:w-36 rounded-xl bg-white/20 border border-white/30 px-3 py-2 text-sm font-semibold text-white placeholder:text-slate-200 focus:outline-none focus:border-[#f5b427]"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/40 text-amber-200 font-extrabold text-sm px-3.5 py-2 transition cursor-pointer disabled:opacity-60"
          >
            + Expense
          </button>
        </form>

        {notice && (
          <span className="text-xs font-bold text-amber-200 bg-black/35 border border-amber-300/30 px-3 py-1 rounded-full">
            {notice}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-white">
        <div className="rounded-3xl bg-white/10 backdrop-blur-[2px] border border-white/25 p-6 sm:p-7 flex flex-col justify-between shadow-2xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">Day Closing</h2>
              <span className="w-2.5 h-2.5 rounded-full bg-white/10 backdrop-blur-[2px]" />
            </div>

            <div className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Total Collected:
            </div>
            <div className="mt-1 text-4xl sm:text-5xl font-black text-[#f5b427] tracking-tight">
              {formatInr(totalCollected)}
            </div>

            <div className="mt-2 text-sm font-bold text-slate-100">
              Completed Orders: <span className="text-white">{completedOrders}</span>
            </div>

            <div className="mt-6 divide-y divide-white/15">
              <div className="py-3.5 flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-sm font-bold text-slate-100">
                  <PayMethodIcon mode="cash" />
                  Cash:
                </span>
                <span className="text-base font-extrabold text-white">{formatInr(cashTotal)}</span>
              </div>

              <div className="py-3.5 flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-sm font-bold text-slate-100">
                  <PayMethodIcon mode="upi" />
                  UPI:
                </span>
                <span className="text-base font-extrabold text-white">{formatInr(upiTotal)}</span>
              </div>

              <div className="py-3.5 flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-sm font-bold text-slate-100">
                  <PayMethodIcon mode="card" />
                  Card:
                </span>
                <span className="text-base font-extrabold text-white">{formatInr(cardTotal)}</span>
              </div>

              <div className="py-3.5 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-100">Safe Cash Reserve</span>
                <span className="text-sm font-extrabold text-emerald-400">{safeCashStatus}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={handleDayClosing}
            className="mt-6 w-full rounded-2xl bg-white/10 backdrop-blur-[2px] hover:bg-white/10 backdrop-blur-[2px] text-slate-950 font-extrabold text-base py-3.5 shadow-md transition cursor-pointer disabled:opacity-60"
          >
            Execute Day Closing
          </button>
        </div>

        <div className="rounded-3xl bg-white/10 backdrop-blur-[2px] border border-white/25 p-6 sm:p-7 flex flex-col justify-between shadow-2xl">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">Monthly Report</h2>
              <span className="text-xs font-bold text-slate-200">
                {recentBills.length} live bills
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 py-2 text-center divide-x divide-white/15">
              <div className="px-2">
                <div className="text-xs font-bold text-slate-200">Monthly</div>
                <div className="mt-1.5 text-base sm:text-lg font-black text-white">
                  {formatInr(monthlySales)}
                </div>
              </div>

              <div className="px-2">
                <div className="text-xs font-bold text-slate-200">Expenses</div>
                <div className="mt-1.5 text-base sm:text-lg font-black text-white">
                  {formatInr(monthlyExpenses)}
                </div>
              </div>

              <div className="px-2">
                <div className="text-xs font-bold text-slate-200">Net Profit</div>
                <div className="mt-1.5 text-base sm:text-lg font-black text-emerald-400">
                  {formatInr(netProfit)}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2">
              {[0, 1, 2].map((dot) => (
                <button
                  key={dot}
                  type="button"
                  onClick={() => setReportSlide(dot)}
                  aria-label={"Report view " + (dot + 1)}
                  className={
                    "h-2 rounded-full transition cursor-pointer " +
                    (reportSlide === dot ? "w-5 bg-white/10 backdrop-blur-[2px]" : "w-2 bg-white/35")
                  }
                />
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-white/15">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-white">
                  Vendor Dues &amp; Pending Payments
                </h3>
                {vendorDues > 0 && (
                  <button
                    type="button"
                    onClick={handleClearVendorDues}
                    className="text-xs font-extrabold text-emerald-300 hover:text-emerald-200 underline cursor-pointer"
                  >
                    Mark Settled
                  </button>
                )}
              </div>

              <form onSubmit={handleAddVendorDue} className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="Vendor name"
                  className="w-28 sm:w-32 rounded-xl bg-white/15 border border-white/25 px-2.5 py-1.5 text-xs font-semibold text-white placeholder:text-slate-200 focus:outline-none focus:border-[#f5b427]"
                />
                <select
                  value={vendorCategory}
                  onChange={(e) => setVendorCategory(e.target.value)}
                  className="rounded-xl bg-white/10 backdrop-blur-[2px] border border-white/25 px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-[#f5b427]"
                >
                  <option value="Dairy & Milk">Dairy &amp; Milk</option>
                  <option value="Coffee & Beans">Coffee &amp; Beans</option>
                  <option value="Bakery & Snacks">Bakery &amp; Snacks</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={vendorDueInput}
                  onChange={(e) => setVendorDueInput(e.target.value)}
                  placeholder="Due (&#8377;)"
                  className="w-24 sm:w-28 rounded-xl bg-white/15 border border-white/25 px-2.5 py-1.5 text-xs font-semibold text-white placeholder:text-slate-200 focus:outline-none focus:border-[#f5b427]"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-white/10 backdrop-blur-[2px] hover:bg-white/10 backdrop-blur-[2px] text-slate-950 font-extrabold text-xs px-3 py-1.5 transition cursor-pointer disabled:opacity-60"
                >
                  + Add Due
                </button>
              </form>

              <div className="mt-3 h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
                <div
                  style={{ width: String(dueProgressPct) + "%" }}
                  className="h-full rounded-full bg-white/10 backdrop-blur-[2px] transition-all duration-300"
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs sm:text-sm font-extrabold">
                <span className="text-amber-300">Dues: {formatInr(vendorDues)}</span>
                <span className="text-white">{formatInr(vendorDues)}</span>
              </div>

              <div className="mt-1 flex items-center justify-between text-xs font-semibold text-slate-200">
                <span>Vendors: {vendorCount}</span>
                <span>{vendorDues === 0 ? "All Settled" : "Pending Dues"}</span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/15">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-amber-300">
                  Month Data Delete &amp; Backup
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="rounded-xl bg-white/10 backdrop-blur-[2px] border border-white/25 px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-[#f5b427]"
                  >
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleDeleteAndArchiveMonth}
                    className="rounded-xl bg-rose-500/85 hover:bg-rose-500 text-white font-extrabold text-xs px-3 py-1 transition cursor-pointer"
                  >
                    Delete &amp; Save Backup
                  </button>
                </div>
              </div>

              {monthArchives.length > 0 && (
                <div className="mt-2.5 max-h-24 overflow-y-auto space-y-1.5 pr-1">
                  {monthArchives.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-white/10 backdrop-blur-[2px] border border-white/15 px-3 py-1.5 text-xs"
                    >
                      <span className="font-bold text-slate-100">
                        {item.monthKey} &bull; {formatInr(item.sales)} ({item.deletedAt})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRestoreArchivedMonth(item)}
                        className="text-amber-300 hover:text-amber-200 font-extrabold underline cursor-pointer shrink-0"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadPdfReport}
            className="mt-6 w-full rounded-2xl bg-white/10 backdrop-blur-[2px] hover:bg-white/10 backdrop-blur-[2px] text-slate-950 font-extrabold text-base py-3.5 shadow-md transition cursor-pointer"
          >
            Download PDF Report
          </button>
        </div>
      </div>

      <PageQuote page="billing" />
    </div>
  );
}