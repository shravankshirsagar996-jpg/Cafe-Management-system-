import { useEffect, useState } from "react";
import PageQuote from "../components/PageQuote";
import {
  loadKitchenOrders,
  updateKitchenOrderStatus,
  recordExpenseEntry,
  addVendorEntry,
} from "../utils/liveCafeStore";

export default function KitchenPage() {
  const [orders, setOrders] = useState(() => loadKitchenOrders());

  const [stockList, setStockList] = useState([
    { id: 1, item: "Coffee Beans", unit: "kg", qty: 5 },
  ]);
  const [itemName, setItemName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [qty, setQty] = useState(5);

  const [category, setCategory] = useState("Raw Material");
  const [vendorSelect, setVendorSelect] = useState("No Vendor");
  const [totalAmount, setTotalAmount] = useState("");
  const [paidNow, setPaidNow] = useState("");
  const [note, setNote] = useState("");
  const [expenses, setExpenses] = useState([]);

  const [vendors, setVendors] = useState([]);
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorDue, setVendorDue] = useState(0);

  useEffect(() => {
    const syncOrders = () => {
      setOrders(loadKitchenOrders());
    };
    syncOrders();
    window.addEventListener("cafe-live-update", syncOrders);
    window.addEventListener("storage", syncOrders);
    const interval = setInterval(syncOrders, 1500);
    return () => {
      window.removeEventListener("cafe-live-update", syncOrders);
      window.removeEventListener("storage", syncOrders);
      clearInterval(interval);
    };
  }, []);

  const handleStatusChange = (orderId, nextStatus) => {
    const updated = updateKitchenOrderStatus(orderId, nextStatus);
    setOrders(updated);
  };

  const handleAddStock = (e) => {
    e.preventDefault();
    const clean = itemName.trim();
    const numQty = Number(qty);
    if (!clean || !Number.isFinite(numQty) || numQty < 0) return;
    setStockList((prev) => [...prev, { id: Date.now(), item: clean, unit, qty: numQty }]);
    setItemName("");
    setQty(5);
  };

  const handleRecordExpense = (e) => {
    e.preventDefault();
    const amt = Number(totalAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    const paid = Number(paidNow || 0);
    setExpenses((prev) => [
      {
        id: Date.now(),
        category,
        vendor: vendorSelect,
        total: amt,
        paid: Number.isFinite(paid) ? paid : 0,
        note: note.trim(),
      },
      ...prev,
    ]);
    recordExpenseEntry(amt);
    setTotalAmount("");
    setPaidNow("");
    setNote("");
  };

  const handleAddVendor = (e) => {
    e.preventDefault();
    const name = vendorName.trim();
    if (!name) return;
    const due = Number(vendorDue || 0);
    setVendors((prev) => [
      ...prev,
      { id: Date.now(), name, phone: vendorPhone.trim(), due },
    ]);
    if (typeof addVendorEntry === "function") {
      addVendorEntry({ name, phone: vendorPhone.trim(), dueAmount: due });
    }
    setVendorName("");
    setVendorPhone("");
    setVendorDue(0);
  };

  const activeOrders = orders.filter((o) => (o.status || "Pending") !== "Ready");

  return (
    <div className="min-h-screen w-full px-4 sm:px-8 py-6 flex flex-col justify-between gap-6 text-slate-100">
      <div className="space-y-6 max-w-6xl w-full mx-auto">
        {/* Live Kitchen Orders (KDS) */}
        <section className="rounded-2xl bg-white/10 backdrop-blur-[2px] border border-amber-400/30 p-5 sm:p-6 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-lg sm:text-xl font-extrabold text-white">
                Live Kitchen Orders (KDS)
              </h2>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
              Active: {activeOrders.length} / Total: {orders.length}
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="rounded-xl bg-black/25 border border-white/10 p-6 text-center text-sm text-slate-300">
              No orders yet. Place an order from mobile (192.168.43.138:5175) to see it live here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((ord, idx) => {
                const status = ord.status || "Pending";
                const orderId = ord.id ?? ord.orderId ?? `ORD-${idx + 1}`;
                const tableLabel = ord.tableNo || ord.table || ord.tableNumber || "Takeaway";
                const itemsList = Array.isArray(ord.items)
                  ? ord.items
                  : Array.isArray(ord.cart)
                  ? ord.cart
                  : [];

                return (
                  <div
                    key={orderId}
                    className="rounded-xl bg-slate-950/75 border border-white/15 p-4 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-amber-300">
                          Table: {tableLabel}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            status === "Ready"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                              : status === "Preparing"
                              ? "bg-sky-500/20 text-sky-300 border border-sky-400/40"
                              : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        #{orderId} {ord.createdAt || ord.updatedAt ? `• ${ord.createdAt || ord.updatedAt}` : ""}
                      </p>

                      {itemsList.length > 0 ? (
                        <ul className="mt-2.5 space-y-1 text-xs text-slate-100">
                          {itemsList.map((it, i) => (
                            <li key={it.id || i} className="flex items-center justify-between">
                              <span>{it.name || it.title || "Item"}</span>
                              <span className="font-bold text-amber-200">
                                x{it.qty || it.quantity || 1}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-slate-300">
                          {ord.summary || ord.note || "Order placed"}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                      {["Pending", "Preparing", "Ready"].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleStatusChange(ord.id ?? orderId, st)}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-extrabold transition ${
                            status === st
                              ? "bg-[#f5b427] text-slate-950"
                              : "bg-white/10 text-slate-200 hover:bg-white/20"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Live Stock & Low Stock Alert */}
        <section className="rounded-2xl bg-white/10 backdrop-blur-[2px] border border-white/10 p-5 sm:p-6 shadow-lg">
          <h2 className="text-lg sm:text-xl font-extrabold text-white mb-4">
            Live Stock &amp; Low Stock Alert
          </h2>
          <form onSubmit={handleAddStock} className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Item (e.g. Coffee Beans)"
              className="flex-1 min-w-[210px] rounded-xl bg-white/10 backdrop-blur-[2px] border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-slate-200 focus:outline-none focus:border-amber-400"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="rounded-xl bg-white/10 backdrop-blur-[2px] border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
            >
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="L">L</option>
              <option value="pcs">pcs</option>
            </select>
            <span className="text-sm font-semibold text-slate-200 px-1">Stock</span>
            <input
              type="number"
              min="0"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-24 rounded-xl bg-white/10 backdrop-blur-[2px] border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="rounded-xl bg-[#f5b427] hover:bg-amber-400 text-slate-950 font-extrabold text-sm px-5 py-2.5 transition"
            >
              + Add Stock
            </button>
          </form>

          {stockList.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {stockList.map((s) => {
                const isLow = Number(s.qty) <= 5;
                return (
                  <div
                    key={s.id}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold border ${
                      isLow
                        ? "bg-amber-500/10 border-amber-400/40 text-amber-300"
                        : "bg-white/10 backdrop-blur-[2px] border-white/10 text-slate-200"
                    }`}
                  >
                    {s.item}: {s.qty} {s.unit} {isLow ? "• Low Stock" : ""}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-2xl bg-white/10 backdrop-blur-[2px] border border-white/10 p-5 sm:p-6 shadow-lg">
            <h2 className="text-lg sm:text-xl font-extrabold text-white mb-4">
              Expenses (Category-wise)
            </h2>
            <form onSubmit={handleRecordExpense} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="rounded-xl bg-white/10 backdrop-blur-[2px] border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-400"
                >
                  <option value="Raw Material">Raw Material</option>
                  <option value="Dairy & Bakery">Dairy &amp; Bakery</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Gas & Utilities">Gas &amp; Utilities</option>
                </select>
                <select
                  value={vendorSelect}
                  onChange={(e) => setVendorSelect(e.target.value)}
                  className="rounded-xl bg-white/10 backdrop-blur-[2px] border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-400"
                >
                  <option value="No Vendor">No Vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="number"
                  min="0"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="Total Amount"
                  className="rounded-xl bg-white/10 backdrop-blur-[2px] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-200 focus:outline-none focus:border-rose-400"
                />
                <input
                  type="number"
                  min="0"
                  value={paidNow}
                  onChange={(e) => setPaidNow(e.target.value)}
                  placeholder="Paid Now"
                  className="rounded-xl bg-white/10 backdrop-blur-[2px] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-200 focus:outline-none focus:border-rose-400"
                />
              </div>

              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note"
                className="w-full rounded-xl bg-white/10 backdrop-blur-[2px] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-200 focus:outline-none focus:border-rose-400"
              />

              <button
                type="submit"
                className="rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm px-5 py-2.5 transition"
              >
                Record Expense
              </button>
            </form>

            {expenses.length > 0 && (
              <div className="mt-4 space-y-2">
                {expenses.map((ex) => (
                  <div
                    key={ex.id}
                    className="rounded-xl bg-white/10 backdrop-blur-[2px] border border-white/10 px-3.5 py-2 text-xs flex items-center justify-between"
                  >
                    <span className="font-bold text-slate-200">
                      {ex.category} {ex.note ? `• ${ex.note}` : ""}
                    </span>
                    <span className="font-extrabold text-rose-300">
                      ₹{Number(ex.total).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white/10 backdrop-blur-[2px] border border-white/10 p-5 sm:p-6 shadow-lg">
            <h2 className="text-lg sm:text-xl font-extrabold text-white mb-4">
              Vendors &amp; Dues
            </h2>
            <form onSubmit={handleAddVendor} className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="Vendor Name"
                className="flex-1 min-w-[150px] rounded-xl bg-white/10 backdrop-blur-[2px] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-200 focus:outline-none focus:border-amber-400"
              />
              <input
                type="text"
                value={vendorPhone}
                onChange={(e) => setVendorPhone(e.target.value)}
                placeholder="Phone"
                className="w-28 rounded-xl bg-white/10 backdrop-blur-[2px] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-200 focus:outline-none focus:border-amber-400"
              />
              <input
                type="number"
                min="0"
                value={vendorDue}
                onChange={(e) => setVendorDue(e.target.value)}
                className="w-20 rounded-xl bg-white/10 backdrop-blur-[2px] border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#f5b427] hover:bg-amber-400 text-slate-950 font-extrabold text-sm px-4 py-2.5 transition"
              >
                + Vendor
              </button>
            </form>

            {vendors.length > 0 && (
              <div className="mt-4 space-y-2">
                {vendors.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-xl bg-white/10 backdrop-blur-[2px] border border-white/10 px-3.5 py-2 text-xs flex items-center justify-between"
                  >
                    <span className="font-bold text-slate-200">
                      {v.name} {v.phone ? `(${v.phone})` : ""}
                    </span>
                    <span className="font-extrabold text-amber-300">
                      Due: ₹{Number(v.due || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <PageQuote page="kitchen" />
    </div>
  );
}

