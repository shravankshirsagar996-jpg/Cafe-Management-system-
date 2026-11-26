import { useEffect, useMemo, useState } from "react";
import PageQuote from "../components/PageQuote";
import { loadKitchenOrders, publishCustomerLiveActivity, sendOrderToKitchen } from "../utils/liveCafeStore";

const CAFE_MENU_ITEMS = [
  { id: "wrp-1", name: "Special Paneer Wrap", category: "Quick Bites", price: 140, desc: "Freshly rolled paneer wrap with spiced sauces.", image: encodeURI("/paneer wrb.jpg") },
  { id: "cld-2", name: "Cold Coffee", category: "Beverages", price: 80, desc: "Chilled creamy cold coffee with rich froth.", image: encodeURI("/cold cofee.jpg") },
  { id: "brg-3", name: "Veg Cheese Burger", category: "Quick Bites", price: 120, desc: "Crispy patty layered with melted cheese.", image: encodeURI("/burger.jpg") },
  { id: "fry-4", name: "Masala Fries", category: "Quick Bites", price: 90, desc: "Golden fries tossed in house masala blend.", image: encodeURI("/fires.jpg") },
  { id: "cap-5", name: "Hot Cappuccino", category: "Beverages", price: 90, desc: "Espresso topped with steamed milk foam.", image: encodeURI("/hot casico.jpg") },
  { id: "piz-6", name: "Paneer Pizza", category: "Mains", price: 180, desc: "Loaded paneer chunks, herbs and cheese.", image: encodeURI("/pizza.jpg") },
  { id: "esp-7", name: "Espresso", category: "Beverages", price: 90, desc: "Rich and bold coffee shot.", image: encodeURI("/Espresso.jpg") },
  { id: "ame-8", name: "Americano", category: "Beverages", price: 110, desc: "Smooth black coffee with hot water.", image: encodeURI("/Americano.jpg") },
  { id: "lat-9", name: "Cafe Latte", category: "Beverages", price: 150, desc: "Creamy milk and balanced espresso.", image: encodeURI("/Cafe Latte.jpg") },
  { id: "moc-10", name: "Mocha", category: "Beverages", price: 170, desc: "Espresso blended with rich chocolate.", image: encodeURI("/Moccha.jpg") },
  { id: "cha-11", name: "Masala Chai / Ginger Tea", category: "Beverages", price: 60, desc: "Hot spiced or ginger tea.", image: encodeURI("/Masala Chai.jpg") },
  { id: "ice-12", name: "Lemon / Peach Iced Tea", category: "Beverages", price: 110, desc: "Refreshing chilled tea.", image: encodeURI("/lemon tea.jpg") },
  { id: "cbw-13", name: "Cold Brew", category: "Beverages", price: 165, desc: "Slow-steeped smooth cold coffee.", image: encodeURI("/Cold Brew.jpg") },
  { id: "shk-14", name: "Chocolate / Oreo Shake", category: "Beverages", price: 175, desc: "Thick and chilled milkshake.", image: encodeURI("/Chocolate.jpg") },
  { id: "moj-15", name: "Fresh Lime Soda / Mojito", category: "Beverages", price: 100, desc: "Zesty citrus and mint cooler.", image: encodeURI("/mojtio.jpg") },
  { id: "gbr-16", name: "Garlic / Cheese Garlic Bread", category: "Quick Bites", price: 130, desc: "Toasted garlic herb bread.", image: encodeURI("/bread.jpg") },
  { id: "nug-17", name: "Veg Nuggets / Cheese Balls", category: "Quick Bites", price: 140, desc: "Crunchy golden snack bites.", image: encodeURI("/chese boll.jpg") },
  { id: "sam-18", name: "Samosa / Cutlet", category: "Quick Bites", price: 70, desc: "Hot and crispy cafe snack.", image: encodeURI("/samosa.jpg") },
  { id: "snd-19", name: "Veg Cheese / Grilled Sandwich", category: "Mains", price: 130, desc: "Toasted veggie and cheese sandwich.", image: encodeURI("/grill sandwhich.jpg") },
  { id: "pst-20", name: "White / Red Sauce Pasta", category: "Mains", price: 180, desc: "Creamy or tangy tossed pasta.", image: encodeURI("/pasta.jpg") },
  { id: "brw-21", name: "Brownie with Ice Cream", category: "Desserts", price: 160, desc: "Warm chocolate brownie and scoop.", image: encodeURI("/browine.jpg") },
  { id: "waf-22", name: "Choco Lava Cake / Waffle", category: "Desserts", price: 150, desc: "Sweet indulgent cafe dessert.", image: encodeURI("/lava cake.jpg") },
  { id: "cmb-23", name: "Coffee + Snack Combo", category: "Desserts", price: 210, desc: "Value combo with hot coffee.", image: encodeURI("/Coffee + Snack Combo.jpg") }
];

const CATEGORIES = ["All", "Quick Bites", "Beverages", "Mains", "Desserts"];

function formatInr(val) {
  const n = Number(val || 0);
  return "\u20B9" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function defaultPhotoForItem(name) {
  const safe = String(name || "Cafe Item").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="18" fill="#f5b427" fill-opacity="0.18"/><circle cx="60" cy="48" r="22" fill="#f5b427" fill-opacity="0.28" stroke="#f5b427" stroke-width="2"/><text x="60" y="55" text-anchor="middle" fill="#f5b427" font-family="sans-serif" font-size="18" font-weight="800">&#9749;</text><text x="60" y="92" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="10" font-weight="800">${safe.slice(0, 14)}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function normalizeTableValue(rawValue) {
  const cleaned = String(rawValue || "").trim();
  if (!cleaned) return "Table 01";
  if (/^table\s*\d+$/i.test(cleaned)) {
    return "Table " + cleaned.replace(/^table\s*/i, "").padStart(2, "0");
  }
  if (/^\d+$/.test(cleaned)) {
    return "Table " + cleaned.padStart(2, "0");
  }
  return cleaned;
}

function resolveTableFromQrUrl() {
  try {
    const searchParams = new URLSearchParams(window.location.search || "");
    const hashStr = String(window.location.hash || "").replace(/^#/, "");
    const hashParams = new URLSearchParams(hashStr.includes("?") ? hashStr.split("?")[1] : hashStr);
    const pathMatch = String(window.location.pathname || "").match(/\/table\/([^/?#]+)/i);

    const raw = (
      searchParams.get("table") ||
      searchParams.get("t") ||
      searchParams.get("tableNo") ||
      hashParams.get("table") ||
      hashParams.get("t") ||
      (pathMatch ? pathMatch[1] : "") ||
      ""
    ).trim();

    if (!raw) return { table: "Table 01", fromQr: false };
    return { table: normalizeTableValue(raw), fromQr: true };
  } catch (_) {
    return { table: "Table 01", fromQr: false };
  }
}

export default function CustomerMenuPage() {
  const initialQr = useMemo(() => resolveTableFromQrUrl(), []);
  const [activeTab, setActiveTab] = useState("menu");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [tableNo, setTableNo] = useState(initialQr.table);
  const [isQrLocked] = useState(initialQr.fromQr);
  const [cart, setCart] = useState([]);
  const [submittedOrders, setSubmittedOrders] = useState(() => loadKitchenOrders());
  const [orderBanner, setOrderBanner] = useState("");

  const [customPhotos, setCustomPhotos] = useState(() => {
    try {
      const raw = localStorage.getItem("cafe_craft_custom_menu_photos_v1");
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  });

  useEffect(() => {
    const syncOrders = () => setSubmittedOrders(loadKitchenOrders());
    window.addEventListener("cafe-live-update", syncOrders);
    window.addEventListener("storage", syncOrders);
    return () => {
      window.removeEventListener("cafe-live-update", syncOrders);
      window.removeEventListener("storage", syncOrders);
    };
  }, []);

  useEffect(() => {
    const count = cart.reduce((acc, r) => acc + Number(r.qty || 0), 0);
    const total = cart.reduce((acc, r) => acc + Number(r.price || 0) * Number(r.qty || 0), 0);
    publishCustomerLiveActivity({
      event: count > 0 ? "SELECTING_ITEMS" : initialQr.fromQr ? "QR_SCANNED" : "BROWSING_MENU",
      tableNo,
      step: count > 0 ? `Selecting ${count} item(s)` : "Viewing Menu",
      selectedCount: count,
      selectedTotal: total,
      itemsPreview: cart.map((r) => `${r.name} x${r.qty}`),
    });
  }, [cart, tableNo, initialQr.fromQr]);

  const handleUploadPhoto = (e, itemId) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const next = { ...customPhotos, [itemId]: reader.result };
        setCustomPhotos(next);
        try {
          localStorage.setItem("cafe_craft_custom_menu_photos_v1", JSON.stringify(next));
        } catch (_) {}
      }
    };
    reader.readAsDataURL(file);
  };

  const filteredItems = useMemo(() => {
    return CAFE_MENU_ITEMS.filter((item) => {
      const matchesCat = selectedCategory === "All" || item.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleAddItem = (item) => {
    setOrderBanner("");
    setCart((prev) => {
      const existing = prev.find((row) => row.id === item.id);
      if (existing) {
        return prev.map((row) =>
          row.id === item.id ? { ...row, qty: row.qty + 1 } : row
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const handleChangeQty = (itemId, delta) => {
    setCart((prev) =>
      prev
        .map((row) => (row.id === itemId ? { ...row, qty: row.qty + delta } : row))
        .filter((row) => row.qty > 0)
    );
  };

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0),
    [cart]
  );
  const taxAmount = useMemo(() => Math.round(subtotal * 0.05), [subtotal]);
  const totalAmount = subtotal + taxAmount;

  const myTableOrders = useMemo(() => {
    if (!isQrLocked) return submittedOrders;
    return submittedOrders.filter((ord) => (ord.tableNo || ord.table) === tableNo);
  }, [submittedOrders, isQrLocked, tableNo]);

  const handleSendToKitchen = () => {
    if (cart.length === 0) {
      setOrderBanner("Menu madhun items Add kara.");
      return;
    }
    const newOrder = {
      id: "ORD-" + String(Date.now()).slice(-5),
      table: tableNo,
      tableNo,
      items: cart,
      subtotal,
      tax: taxAmount,
      total: totalAmount,
      status: "Pending",
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };
    const updatedKitchen = sendOrderToKitchen(newOrder);
    setSubmittedOrders(updatedKitchen);
    setCart([]);
    setOrderBanner("Order sent to Kitchen for " + tableNo + "!");
    publishCustomerLiveActivity({
      event: "ORDER_SENT",
      tableNo,
      step: `Sent Order ${newOrder.id}`,
      selectedCount: 0,
      selectedTotal: 0,
    });
  };

  const tableOptions = useMemo(() => {
    const base = ["Table 01", "Table 02", "Table 03", "Table 04", "Table 05", "Table 06", "Table 07", "Table 08"];
    return base.includes(tableNo) ? base : [tableNo, ...base];
  }, [tableNo]);

  return (
    <div className="w-full space-y-6 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab("menu")}
            className={
              "rounded-full px-4 py-1.5 text-xs sm:text-sm font-extrabold transition cursor-pointer " +
              (activeTab === "menu"
                ? "bg-[#f5b427] text-slate-950"
                : "bg-white/10 border border-white/25 text-white hover:bg-white/15")
            }
          >
            Menu
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={
              "rounded-full px-4 py-1.5 text-xs sm:text-sm font-extrabold transition cursor-pointer " +
              (activeTab === "orders"
                ? "bg-[#f5b427] text-slate-950"
                : "bg-white/10 border border-white/25 text-white hover:bg-white/15")
            }
          >
            My Orders ({myTableOrders.length})
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-[2px] border border-white/25 px-3.5 py-1 text-xs sm:text-sm font-extrabold text-white">
          <span>Table QR &bull;</span>
          <span className="text-[#f5b427]">{tableNo}</span>
          <span className="text-emerald-300"></span>
        </div>
      </div>

      {activeTab === "orders" ? (
        <div className="rounded-3xl bg-white/10 backdrop-blur-[2px] border border-white/25 p-6 shadow-2xl space-y-4">
          <h2 className="text-xl font-black text-white">My Orders &mdash; {tableNo}</h2>
          {myTableOrders.length === 0 ? (
            <div className="text-sm font-bold text-slate-200 py-8 text-center">
              No orders sent yet for {tableNo}. Add items from Menu and click Send to Kitchen.
            </div>
          ) : (
            <div className="space-y-3">
              {myTableOrders.map((ord) => {
                const st = ord.status || "Pending";
                const badgeClass =
                  st === "Ready"
                    ? "bg-emerald-500/25 border-emerald-300/40 text-emerald-200"
                    : st === "Preparing"
                    ? "bg-amber-500/25 border-amber-300/40 text-amber-200"
                    : "bg-white/15 border-white/25 text-white";
                return (
                  <div
                    key={ord.id}
                    className="rounded-2xl bg-white/10 border border-white/20 p-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2 font-black text-sm text-[#f5b427]">
                        <span>{ord.id} &bull; {ord.tableNo || ord.table} ({ord.time})</span>
                        <span className={"rounded-full border px-2.5 py-0.5 text-xs font-extrabold " + badgeClass}>
                          {st}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white mt-1">
                        {(ord.items || []).map((it) => `${it.name} x${it.qty}`).join(", ")}
                      </div>
                    </div>
                    <div className="text-base font-black text-emerald-300">
                      {formatInr(ord.total)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 rounded-3xl bg-white/10 backdrop-blur-[2px] border border-white/25 p-5 sm:p-6 shadow-2xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Cafe Menu</h1>
                <p className="text-xs sm:text-sm font-bold text-slate-200">
                  Select items to place your order
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items..."
                  className="w-36 sm:w-44 rounded-full bg-white/15 border border-white/25 px-3.5 py-1.5 text-xs font-bold text-white placeholder:text-slate-300 focus:outline-none focus:border-[#f5b427]"
                />
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={
                      "rounded-full px-3 py-1.5 text-xs font-extrabold transition cursor-pointer " +
                      (selectedCategory === cat
                        ? "bg-[#f5b427] text-slate-950"
                        : "bg-white/10 border border-white/20 text-white hover:bg-white/15")
                    }
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[560px] overflow-y-auto pr-1">
              {filteredItems.map((item) => {
                const imgSrc = customPhotos[item.id] || item.image || defaultPhotoForItem(item.name);
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-white/10 backdrop-blur-[2px] border border-white/25 p-3.5 flex items-center justify-between gap-3 shadow-md"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <label className="relative w-16 h-16 rounded-2xl overflow-hidden border border-white/25 shrink-0 cursor-pointer group">
                        <img
                          src={imgSrc}
                          alt={item.name}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = defaultPhotoForItem(item.name);
                          }}
                          className="w-full h-full object-cover"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleUploadPhoto(e, item.id)}
                          className="hidden"
                          title="Change photo"
                        />
                      </label>

                      <div className="min-w-0">
                        <div className="text-sm sm:text-base font-black text-white truncate">
                          {item.name}
                        </div>
                        <div className="text-xs font-bold text-slate-200 line-clamp-1">
                          {item.desc}
                        </div>
                        <div className="mt-1 text-sm font-black text-[#f5b427]">
                          {formatInr(item.price)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddItem(item)}
                      className="rounded-xl bg-white/15 hover:bg-[#f5b427] hover:text-slate-950 border border-white/25 text-white font-black text-xs px-3.5 py-2 transition cursor-pointer shrink-0"
                    >
                      Add
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-4 rounded-3xl bg-white/10 backdrop-blur-[2px] border border-white/25 p-5 sm:p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-black text-white">Your Order</h2>

            <div>
              <label className="block text-xs font-extrabold text-slate-200 mb-1.5">
                Table Number {isQrLocked ? "(From Table QR)" : ""}
              </label>
              {isQrLocked ? (
                <div className="w-full rounded-2xl bg-white/10 border border-[#f5b427]/50 px-3.5 py-2.5 text-sm font-black text-[#f5b427]">
                  {tableNo}
                </div>
              ) : (
                <select
                  value={tableNo}
                  onChange={(e) => setTableNo(e.target.value)}
                  className="w-full rounded-2xl bg-white/10 backdrop-blur-[2px] border border-white/25 px-3.5 py-2.5 text-sm font-extrabold text-white focus:outline-none focus:border-[#f5b427]"
                >
                  {tableOptions.map((t) => (
                    <option key={t} value={t} className="bg-[#111622] text-white">
                      {t}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="py-10 text-center text-xs sm:text-sm font-bold text-slate-200 border-y border-white/15">
                Menu madhun items Add kara.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto border-y border-white/15 py-3 pr-1">
                {cart.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-2 text-xs sm:text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-black text-white truncate">{row.name}</div>
                      <div className="text-xs font-bold text-[#f5b427]">
                        {formatInr(Number(row.price || 0) * Number(row.qty || 0))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleChangeQty(row.id, -1)}
                        className="w-6 h-6 rounded-lg bg-white/15 hover:bg-white/25 font-black text-white cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-black text-white">{row.qty}</span>
                      <button
                        type="button"
                        onClick={() => handleChangeQty(row.id, 1)}
                        className="w-6 h-6 rounded-lg bg-white/15 hover:bg-white/25 font-black text-white cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5 text-xs sm:text-sm font-extrabold">
              <div className="flex items-center justify-between text-slate-200">
                <span>Subtotal</span>
                <span className="text-white">{formatInr(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-200">
                <span>CGST/SGST (5%):</span>
                <span className="text-white">{formatInr(taxAmount)}</span>
              </div>
              <div className="pt-2 border-t border-white/15 flex items-center justify-between text-sm sm:text-base font-black">
                <span className="text-white">Total Amount:</span>
                <span className="text-[#f5b427]">{formatInr(totalAmount)}</span>
              </div>
            </div>

            {orderBanner && (
              <div className="rounded-xl bg-white/15 border border-amber-300/40 px-3 py-2 text-xs font-extrabold text-amber-200 text-center">
                {orderBanner}
              </div>
            )}

            <button
              type="button"
              onClick={handleSendToKitchen}
              className="w-full rounded-2xl bg-[#f5b427] hover:bg-[#e5a318] text-slate-950 font-black text-sm sm:text-base py-3 shadow-md transition cursor-pointer"
            >
              Send to Kitchen
            </button>
          </div>
        </div>
      )}

      <PageQuote page="menu" />
    </div>
  );
}
