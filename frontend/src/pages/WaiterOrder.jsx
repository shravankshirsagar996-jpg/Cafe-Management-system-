import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import PageQuote from "../components/PageQuote";

export default function WaiterOrder() {
  const [menu, setMenu] = useState([]);
  const [tableNo, setTableNo] = useState("T1");
  const [orderType, setOrderType] = useState("dine_in");
  const [cart, setCart] = useState([]);
  const [newItem, setNewItem] = useState({ name: "", category: "Beverages", price: "" });
  const [msg, setMsg] = useState("");

  const loadMenu = async () => {
    const data = await apiRequest("/api/orders/menu").catch(() => []);
    setMenu(data);
  };

  useEffect(() => {
    loadMenu();
  }, []);

  const addMenuItem = async (e) => {
    e.preventDefault();
    await apiRequest("/api/orders/menu", {
      method: "POST",
      body: JSON.stringify({ ...newItem, price: Number(newItem.price) }),
    });
    setNewItem({ name: "", category: "Beverages", price: "" });
    loadMenu();
  };

  const addToCart = (item) => {
    setCart((prev) => {
      const found = prev.find((x) => x.menu_item_id === item.id);
      if (found) {
        return prev.map((x) => (x.menu_item_id === item.id ? { ...x, quantity: x.quantity + 1 } : x));
      }
      return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const placeOrder = async () => {
    if (!cart.length) return;
    const order = await apiRequest("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        table_no: tableNo,
        order_type: orderType,
        items: cart.map((c) => ({ menu_item_id: c.menu_item_id, quantity: c.quantity })),
      }),
    });
    setCart([]);
    setMsg("Order #" + order.id + " (Table " + tableNo + ") Kitchen la pathavla aahe!");
  };

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-2xl font-bold">Waiter Phone Order</h2>
        {msg && <div className="bg-emerald-950/60 border border-emerald-700 text-emerald-300 p-3 rounded-xl text-sm">{msg}</div>}

        <form onSubmit={addMenuItem} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap gap-2">
          <input
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm flex-1"
            placeholder="Menu Item Name (e.g. Cold Coffee)"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            required
          />
          <input
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm w-32"
            placeholder="Category"
            value={newItem.category}
            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
            required
          />
          <input
            type="number"
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm w-28"
            placeholder="Price"
            value={newItem.price}
            onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
            required
          />
          <button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-1.5 rounded-lg text-sm">
            + Add Item
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {menu.map((m) => (
            <button
              key={m.id}
              onClick={() => addToCart(m)}
              className="text-left bg-slate-900 hover:bg-slate-800 border border-slate-800 p-4 rounded-2xl transition"
            >
              <p className="font-semibold">{m.name}</p>
              <p className="text-xs text-slate-400">{m.category}</p>
              <p className="text-amber-400 font-bold mt-2">Rs. {m.price}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 h-fit">
        <h3 className="text-lg font-bold">Current Order</h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            value={tableNo}
            onChange={(e) => setTableNo(e.target.value)}
            placeholder="Table No"
          />
          <select
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            value={orderType}
            onChange={(e) => setOrderType(e.target.value)}
          >
            <option value="dine_in">Dine-In</option>
            <option value="takeaway">Takeaway</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {cart.map((c) => (
            <div key={c.menu_item_id} className="flex justify-between text-sm bg-slate-800/70 p-2.5 rounded-lg">
              <span>{c.name} x {c.quantity}</span>
              <span>Rs. {(c.price * c.quantity).toFixed(2)}</span>
            </div>
          ))}
          {!cart.length && <p className="text-xs text-slate-500">Menu madhun item nivda.</p>}
        </div>

        <div className="border-t border-slate-800 pt-3 flex justify-between font-bold text-lg">
          <span>Total</span>
          <span className="text-amber-400">Rs. {total.toFixed(2)}</span>
        </div>

        <button
          onClick={placeOrder}
          disabled={!cart.length}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold py-2.5 rounded-xl text-sm"
        >
          Send to Kitchen
        </button>
      </div>
      <PageQuote page="orders" />
    </div>
  );
}