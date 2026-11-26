const LIVE_STATE_KEY = "cafe_craft_live_state_v1";
const KITCHEN_ORDERS_KEY = "cafe_craft_kitchen_orders_v1";
const CUSTOMER_ACTIVITY_KEY = "cafe_craft_customer_live_activity_v1";

const DEFAULT_LIVE_STATE = {
  todaySales: 0,
  todayExpenses: 0,
  todayNet: 0,
  pendingOrders: 0,
  activeKitchenOrders: 0,
  lowStockCount: 0,
  vendorDues: 0,
  activeTable: "",
  customerLiveActivity: null,
  latestKitchenOrder: null,
};

export function loadLiveState() {
  try {
    const raw = localStorage.getItem(LIVE_STATE_KEY);
    if (!raw) return { ...DEFAULT_LIVE_STATE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_LIVE_STATE, ...(parsed && typeof parsed === "object" ? parsed : {}) };
  } catch (_) {
    return { ...DEFAULT_LIVE_STATE };
  }
}

export function saveLiveState(nextState) {
  const merged = { ...loadLiveState(), ...(nextState && typeof nextState === "object" ? nextState : {}) };
  try {
    localStorage.setItem(LIVE_STATE_KEY, JSON.stringify(merged));
  } catch (_) {}
  try {
    window.dispatchEvent(new CustomEvent("cafe-live-update", { detail: merged }));
  } catch (_) {}
  return merged;
}

export function loadKitchenOrders() {
  try {
    const raw = localStorage.getItem(KITCHEN_ORDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

export function sendOrderToKitchen(order) {
  const existing = loadKitchenOrders();
  const nextOrders = [order, ...existing].slice(0, 100);
  try {
    localStorage.setItem(KITCHEN_ORDERS_KEY, JSON.stringify(nextOrders));
  } catch (_) {}

  const curr = loadLiveState();
  const pendingCount = nextOrders.filter((o) => (o.status || "Pending") !== "Ready").length;
  saveLiveState({
    ...curr,
    pendingOrders: pendingCount,
    activeKitchenOrders: nextOrders.length,
    latestKitchenOrder: order,
  });
  return nextOrders;
}

export function updateKitchenOrderStatus(orderId, nextStatus) {
  const validStatuses = ["Pending", "Preparing", "Ready"];
  const targetStatus = validStatuses.includes(nextStatus) ? nextStatus : "Pending";
  const currentOrders = loadKitchenOrders();
  const updatedOrders = currentOrders.map((ord) =>
    ord.id === orderId
      ? {
          ...ord,
          status: targetStatus,
          updatedAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        }
      : ord
  );
  try {
    localStorage.setItem(KITCHEN_ORDERS_KEY, JSON.stringify(updatedOrders));
  } catch (_) {}

  const pendingCount = updatedOrders.filter((o) => (o.status || "Pending") !== "Ready").length;
  const curr = loadLiveState();
  saveLiveState({
    ...curr,
    pendingOrders: pendingCount,
    activeKitchenOrders: updatedOrders.length,
  });
  return updatedOrders;
}

export function loadCustomerLiveActivity() {
  try {
    const raw = localStorage.getItem(CUSTOMER_ACTIVITY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function publishCustomerLiveActivity(activity) {
  const payload = {
    ...(activity || {}),
    updatedAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    ts: Date.now(),
  };
  try {
    localStorage.setItem(CUSTOMER_ACTIVITY_KEY, JSON.stringify(payload));
  } catch (_) {}

  const curr = loadLiveState();
  saveLiveState({
    ...curr,
    customerLiveActivity: payload,
    activeTable: payload.tableNo || curr.activeTable || "",
  });
  return payload;
}
export function resetDayCountersOnly() {
  const curr = loadLiveState();
  return saveLiveState({
    ...curr,
    todaySales: 0,
    todayExpenses: 0,
    todayNet: 0,
    pendingOrders: 0,
    activeKitchenOrders: 0,
    latestKitchenOrder: null,
  });
}
export function recordExpenseEntry(entry) {
  const curr = loadLiveState();
  const amount = Number(entry?.amount ?? entry?.totalAmount ?? entry ?? 0) || 0;
  const nextExpenses = Number(curr.todayExpenses || 0) + amount;
  const nextSales = Number(curr.todaySales || 0);
  return saveLiveState({
    ...curr,
    todayExpenses: nextExpenses,
    todayNet: nextSales - nextExpenses,
    lastExpense: entry,
  });
}
export function recordBillSettlement(settlement) {
  const curr = loadLiveState();
  const amount = Number(settlement?.amount ?? settlement?.totalAmount ?? settlement ?? 0) || 0;
  const nextSales = Number(curr.todaySales || 0) + amount;
  const nextExpenses = Number(curr.todayExpenses || 0);
  return saveLiveState({
    ...curr,
    todaySales: nextSales,
    todayNet: nextSales - nextExpenses,
    lastSettlement: settlement,
  });
}
export function addVendorEntry(vendor) {
  const curr = loadLiveState();
  const dueDelta = Number(vendor?.dueAmount ?? vendor?.dues ?? vendor?.amount ?? 0) || 0;
  const nextDues = Number(curr.vendorDues || 0) + dueDelta;
  const existingVendors = Array.isArray(curr.vendors) ? curr.vendors : [];
  return saveLiveState({
    ...curr,
    vendorDues: nextDues,
    vendors: vendor && typeof vendor === "object" ? [vendor, ...existingVendors] : existingVendors,
  });
}
export function executeDayClosing(closingPayload) {
  const curr = loadLiveState();
  const closedRecord = {
    ...(closingPayload && typeof closingPayload === "object" ? closingPayload : {}),
    closedAt: new Date().toISOString(),
    sales: Number(closingPayload?.sales ?? curr.todaySales ?? 0) || 0,
    expenses: Number(closingPayload?.expenses ?? curr.todayExpenses ?? 0) || 0,
    net: Number(closingPayload?.net ?? curr.todayNet ?? 0) || 0,
  };
  const history = Array.isArray(curr.dayClosings) ? curr.dayClosings : [];
  return saveLiveState({
    ...curr,
    todaySales: 0,
    todayExpenses: 0,
    todayNet: 0,
    pendingOrders: 0,
    activeKitchenOrders: 0,
    latestKitchenOrder: null,
    lastDayClosing: closedRecord,
    dayClosings: [closedRecord, ...history].slice(0, 60),
  });
}
export function loadStaffRoster() {
  try {
    const raw = localStorage.getItem("cafe_craft_staff_roster_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    const curr = loadLiveState();
    return Array.isArray(curr.staffRoster) ? curr.staffRoster : [];
  } catch (_) {
    return [];
  }
}
export function syncStaffRoster(roster) {
  const safeRoster = Array.isArray(roster) ? roster : [];
  try {
    localStorage.setItem("cafe_craft_staff_roster_v1", JSON.stringify(safeRoster));
  } catch (_) {}
  const curr = loadLiveState();
  const totalPayroll = safeRoster.reduce((sum, m) => sum + (Number(m?.salary ?? m?.amount ?? 0) || 0), 0);
  return saveLiveState({
    ...curr,
    staffRoster: safeRoster,
    staffCount: safeRoster.length,
    totalPayroll,
  });
}

// --- cafe-realtime-sync-bridge ---
(function initCrossDeviceCafeSync() {
  if (typeof window === "undefined") return;

  const pushKitchenOrdersToServer = async () => {
    try {
      const rawOrders = localStorage.getItem(KITCHEN_ORDERS_KEY);
      if (!rawOrders) return;
      const parsed = JSON.parse(rawOrders);
      if (!Array.isArray(parsed)) return;
      await fetch("/api/cafe-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: parsed }),
      });
    } catch (_) {}
  };

  const pullKitchenOrdersFromServer = async () => {
    try {
      const res = await fetch("/api/cafe-sync", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.orders) && data.orders.length > 0) {
        const incoming = JSON.stringify(data.orders);
        if (localStorage.getItem(KITCHEN_ORDERS_KEY) !== incoming) {
          localStorage.setItem(KITCHEN_ORDERS_KEY, incoming);
          window.dispatchEvent(new CustomEvent("cafe-live-update"));
          window.dispatchEvent(new Event("storage"));
        }
      }
    } catch (_) {}
  };

  window.addEventListener("cafe-live-update", () => {
    pushKitchenOrdersToServer();
  });

  setInterval(pullKitchenOrdersFromServer, 1200);
})();
