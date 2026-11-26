import PageQuote from "../components/PageQuote";
import { loadLiveState, resetDayCountersOnly } from "../utils/liveCafeStore";
import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";

function formatInr(amount) {
  const num = Number(amount || 0);
  return "\u20B9" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function KpiBadge({ kind }) {
  if (kind === "sale") {
    return (
      <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-[2px] border border-amber-300/50 overflow-hidden flex items-center justify-center shrink-0 shadow">
        <img
          src="/home%20icon.jpg"
          alt="Today's Sale"
          className="w-full h-full object-cover scale-110"
        />
      </div>
    );
  }
  if (kind === "expense") {
    return (
      <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-[2px] border border-amber-300/50 overflow-hidden flex items-center justify-center shrink-0 shadow">
        <img
          src="/money%20bag.png"
          alt="Today's Kharcha"
          className="w-full h-full object-cover scale-110"
        />
      </div>
    );
  }
  return (
    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-[2px] border border-amber-300/50 overflow-hidden flex items-center justify-center shrink-0 shadow">
      <img
        src="/net%20profit.jpg"
        alt="Net Profit"
        className="w-full h-full object-cover scale-110"
      />
    </div>
  );
}

export default function OwnerDashboard() {
  const [liveStore, setLiveStore] = useState(() => loadLiveState());
  const [dayResetActive, setDayResetActive] = useState(false);

  useEffect(() => {
    const syncAll = (e) => {
      const next = e?.detail && typeof e.detail === "object" ? e.detail : loadLiveState();
      setDayResetActive(false);
      setLiveStore({ ...next });
    };
    syncAll();
    window.addEventListener("cafe-live-update", syncAll);
    window.addEventListener("storage", syncAll);
    window.addEventListener("focus", syncAll);
    return () => {
      window.removeEventListener("cafe-live-update", syncAll);
      window.removeEventListener("storage", syncAll);
      window.removeEventListener("focus", syncAll);
    };
  }, []);
  const [summary, setSummary] = useState({
    today_sales: 0,
    today_expenses: 0,
    today_profit: 0,
    low_stock_count: 0,
    pending_orders_count: 0,
  });
  const [error, setError] = useState("");

  const loadSummary = async () => {
    try {
      const data = await apiRequest("/api/dashboard/summary");
      setSummary(data);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    loadSummary();
    const timer = setInterval(loadSummary, 10000);
    return () => clearInterval(timer);
  }, []);

    const liveSales = dayResetActive ? 0 : Number(liveStore?.totalCollected ?? 0);
  const liveExpenses = dayResetActive
    ? 0
    : Number(liveStore?.todayExpenses ?? liveStore?.monthExpenses ?? 0);
  const liveOrders = dayResetActive ? 0 : Number(liveStore?.completedOrders ?? 0);

  const liveSummary = dayResetActive
    ? {
        ...summary,
        today_sales: 0,
        today_expenses: 0,
        today_profit: 0,
        pending_orders_count: 0,
      }
    : {
        ...summary,
        today_sales: Number(summary?.today_sales || 0) + liveSales,
        today_expenses: Number(summary?.today_expenses || 0) + liveExpenses,
        today_profit:
          Number(summary?.today_sales || 0) +
          liveSales -
          (Number(summary?.today_expenses || 0) + liveExpenses),
        pending_orders_count: Number(summary?.pending_orders_count || 0) + liveOrders,
      };

  const profitMargin =
    liveSummary.today_sales > 0
      ? ((liveSummary.today_profit / liveSummary.today_sales) * 100).toFixed(1)
      : "0.0";

    const slots = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const liveSalesVal = Number(liveSummary.today_sales || 0);
  const liveExpVal = Number(liveSummary.today_expenses || 0);
  const maxVal = Math.max(liveSalesVal, liveExpVal, 100);
  const saleRatio =
    liveSalesVal > 0
      ? Math.max(18, Math.min(96, Math.round((liveSalesVal / maxVal) * 92)))
      : 12;
  const expRatio =
    liveExpVal > 0
      ? Math.max(14, Math.min(90, Math.round((liveExpVal / maxVal) * 84)))
      : 8;

  const chartSeries = slots.map((label, idx) => {
    const baseWeights = [0.45, 0.52, 0.61, 0.58, 0.72, 0.84, 1.0];
    const w = baseWeights[idx];
    return {
      label,
      sales: Math.max(8, Math.min(98, Math.round(saleRatio * w))),
      expenses: Math.max(6, Math.min(92, Math.round(expRatio * w))),
    };
  });
  const [statusToggles, setStatusToggles] = useState(() => ({
    orderMenu: true,
    kitchenScreen: true,
    billingModes: true,
    inventoryAlerts: true,
    staffShift: true,
  }));

  const toggleStatusItem = (key) => {
    setStatusToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const statusRows = [
    {
      key: "orderMenu",
      label: "Order Menu & Cart:",
      state: statusToggles.orderMenu ? "Active" : "Paused",
      note: "(Orders -> Kitchen)",
      stateClass: statusToggles.orderMenu ? "text-emerald-400" : "text-amber-300",
      boxMode: statusToggles.orderMenu ? "checked" : "empty",
    },
    {
      key: "kitchenScreen",
      label: "Kitchen Screen:",
      state: statusToggles.kitchenScreen ? "Online" : "Standby",
      note: "",
      stateClass: statusToggles.kitchenScreen ? "text-emerald-400" : "text-slate-300",
      boxMode: statusToggles.kitchenScreen ? "empty" : "checked",
    },
    {
      key: "billingModes",
      label: "Cash / UPI / Card Billing:",
      state: statusToggles.billingModes ? "Online" : "Offline",
      note: "",
      stateClass: statusToggles.billingModes ? "text-emerald-400" : "text-rose-400",
      boxMode: statusToggles.billingModes ? "checked" : "empty",
    },
    {
      key: "inventoryAlerts",
      label: "Inventory Alerts:",
      state: String(Number(liveSummary && liveSummary.low_stock_count ? liveSummary.low_stock_count : 0)) + " Low Stock",
      note: "",
      stateClass: statusToggles.inventoryAlerts ? "text-amber-400" : "text-slate-300",
      boxMode: statusToggles.inventoryAlerts ? "amber" : "empty",
    },
    {
      key: "staffShift",
      label: "Staff Shift:",
      state: statusToggles.staffShift ? "Ongoing" : "On Break",
      note: "",
      stateClass: statusToggles.staffShift ? "text-emerald-400" : "text-amber-300",
      boxMode: statusToggles.staffShift ? "empty" : "checked",
    },
  ];

return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Owner Dashboard Overview</h2>
          <p className="text-sm text-slate-300">Real-time cafe &amp; restaurant performance</p>
        </div>
        <button
          onClick={() => { const cleared = resetDayCountersOnly(); setDayResetActive(true); setLiveStore({ ...cleared }); setSummary((prev) => ({ ...prev, today_sales: 0, today_expenses: 0, today_profit: 0, pending_orders_count: 0 })); }}
          style={{ boxShadow: "0 0 18px rgba(245, 185, 66, 0.3)" }}
          className="bg-white/10 backdrop-blur-[2px] hover:bg-white/10 backdrop-blur-[2px] text-slate-950 font-bold px-4 py-2 rounded-full text-xs transition"
        >
          Refresh Live
        </button>
      </div>

      {error && (
        <div className="bg-rose-950/70 border border-rose-700 text-rose-200 px-4 py-2.5 rounded-2xl text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div
          style={{ boxShadow: "0 0 26px rgba(243, 190, 82, 0.32)" }}
          className="rounded-3xl p-5 bg-gradient-to-br from-[#f6cb67] via-[#eab14d] to-[#d99b38] text-slate-950 border border-amber-200/80"
        >
          <p className="text-sm font-bold text-slate-950/90">Today&rsquo;s Sale</p>
          <div className="flex items-center gap-3.5 mt-3">
            <KpiBadge kind="sale" />
            <div>
              <p className="text-2xl font-extrabold text-white tracking-tight drop-shadow-sm">
                {formatInr(liveSummary.today_sales)}
              </p>
              <p className="text-xs font-semibold text-slate-950/80 mt-0.5">Live settled bills</p>
            </div>
          </div>
        </div>

        <div
          style={{ boxShadow: "0 0 18px rgba(243, 190, 82, 0.16)" }}
          className="rounded-3xl p-5 bg-white/10 backdrop-blur-[2px] border border-[#d8b467]/70 text-slate-100"
        >
          <p className="text-sm font-semibold text-slate-100">Today&rsquo;s Kharcha</p>
          <div className="flex items-center gap-3.5 mt-3">
            <KpiBadge kind="expense" />
            <div>
              <p className="text-2xl font-extrabold text-[#e8b458] tracking-tight">
                {formatInr(liveSummary.today_expenses)}
              </p>
              <p className="text-xs text-slate-300/85 mt-0.5">Category-wise tracked</p>
            </div>
          </div>
        </div>

        <div
          style={{ boxShadow: "0 0 18px rgba(243, 190, 82, 0.16)" }}
          className="rounded-3xl p-5 bg-white/10 backdrop-blur-[2px] border border-[#d8b467]/70 text-slate-100"
        >
          <p className="text-sm font-semibold text-slate-100">Net Profit</p>
          <div className="flex items-center gap-3.5 mt-3">
            <KpiBadge kind="profit" />
            <div>
              <p className="text-2xl font-extrabold text-white tracking-tight">
                {formatInr(liveSummary.today_profit)}
              </p>
              <p className="text-xs text-slate-300/85 mt-0.5">
                <span className="text-emerald-400 font-semibold">{profitMargin}%</span> margin today
              </p>
            </div>
          </div>
        </div>

        <div
          style={{ boxShadow: "0 0 18px rgba(243, 190, 82, 0.16)" }}
          className="rounded-3xl p-5 bg-white/10 backdrop-blur-[2px] border border-[#d8b467]/70 text-slate-100"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-100">Low Stock &amp; Alerts</p>
            <span className="w-6 h-6 rounded-md bg-amber-500/20 border border-amber-400/50 text-amber-400 flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3L2 20h20L12 3zm1 14h-2v-2h2v2zm0-4h-2V9h2v4z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 space-y-1">
            <p className="text-lg font-bold leading-snug">
              <span className="text-[#e09362]">{liveSummary.low_stock_count} Low Items</span>{" "}
              <span className="text-slate-200">&amp;</span>
            </p>
            <p className="text-lg font-bold text-[#e8be6b] leading-snug">
              {liveSummary.pending_orders_count} Pending Orders
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div
          style={{ boxShadow: "0 0 20px rgba(243, 190, 82, 0.14)" }}
          className="lg:col-span-7 bg-white/10 backdrop-blur-[2px] border border-[#d8b467]/65 rounded-3xl p-6 flex flex-col justify-between space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white">Sales vs Expenses Overview</h3>
              <p className="text-xs text-slate-300/80">Performance comparison across periods</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 text-amber-200 font-semibold">
                <span className="w-5 h-3 rounded-sm bg-gradient-to-r from-[#f6cb67] to-[#d99b38] inline-block" /> Sales
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-200 font-medium">
                <span className="w-5 h-3 rounded-sm bg-white/10 backdrop-blur-[2px] inline-block" /> Expenses
              </span>
            </div>
          </div>

          <div className="h-52 pt-4 border-b border-slate-600/60 flex items-end justify-around gap-3 px-2">
            {chartSeries.map((col) => (
              <div key={col.label} className="flex flex-col items-center gap-2 h-full justify-end flex-1">
                <div className="w-full max-w-[48px] flex items-end justify-center gap-1 h-40">
                  <div
                    style={{ height: col.salesPct + "%" }}
                    className="w-4 rounded-t-sm bg-gradient-to-t from-[#d99b38] to-[#f6cb67] transition-all duration-300"
                  />
                  <div
                    style={{ height: col.expPct + "%" }}
                    className="w-4 rounded-t-sm bg-white/10 backdrop-blur-[2px] transition-all duration-300"
                  />
                </div>
                <span className="text-[11px] text-slate-300 font-medium">{col.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{ boxShadow: "0 0 20px rgba(243, 190, 82, 0.14)" }}
          className="lg:col-span-5 bg-white/10 backdrop-blur-[2px] border border-[#d8b467]/65 rounded-3xl p-6 space-y-4"
        >
          <h3 className="text-lg font-bold text-white">System Status &amp; Quick Info</h3>

          <div className="space-y-2.5">
            {statusRows.map((row) => (
              <button
                key={row.key || row.label}
                type="button"
                onClick={() => row.key && toggleStatusItem(row.key)}
                className="w-full text-left flex items-center justify-between gap-2 bg-white/10 backdrop-blur-[2px] hover:bg-white/10 backdrop-blur-[2px] border border-slate-600/50 hover:border-amber-400/40 rounded-xl px-3.5 py-2.5 text-xs transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {row.boxMode === "checked" && (
                    <span className="w-5 h-5 rounded-md border border-slate-400/70 bg-slate-700/60 text-slate-200 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                  {row.boxMode === "amber" && (
                    <span className="w-5 h-5 rounded-md bg-white/10 backdrop-blur-[2px] border border-amber-400/40 shrink-0" />
                  )}
                  {row.boxMode === "empty" && (
                    <span className="w-5 h-5 rounded-md border border-slate-400/60 bg-transparent shrink-0" />
                  )}

                  <span className="text-slate-100 font-medium">
                    {row.label}{" "}
                    {row.note && (
                      <>
                        <span className="text-emerald-400 font-semibold">{row.state}</span>{" "}
                        <span className="text-slate-300">{row.note}</span>
                      </>
                    )}
                  </span>
                </div>

                {!row.note && (
                  <span className={"font-semibold whitespace-nowrap " + row.stateClass}>
                    {row.state}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
          <PageQuote page="dashboard" />
    </div>
  );
}