import { useAuth } from "../context/AuthContext";
import PageQuote from "../components/PageQuote";

export default function LoginPage({ onSuccess }) {
  const { loginUser } = useAuth();

  const handleSelectRole = (role) => {
    const profileMap = {
      owner: { id: 1, name: "Cafe Holder", role: "owner" },
      customer: { id: 2, name: "Customer", role: "customer" },
      kitchen: { id: 3, name: "Kitchen Staff", role: "kitchen" },
    };

    const chosen = profileMap[role];
    if (!chosen) return;

    try {
      localStorage.setItem("activeRole", chosen.role.toUpperCase());
      window.dispatchEvent(new Event("cafe-role-update"));
    } catch (_) {}

    if (typeof loginUser === "function") {
      loginUser(chosen);
    }

    if (typeof onSuccess === "function") {
      onSuccess(chosen.role);
    }
  };

  return (
    <div className="h-[calc(100vh-7.5rem)] max-h-[calc(100vh-7.5rem)] w-full overflow-hidden px-6 sm:px-12 pt-2 pb-2 flex flex-col justify-between text-white">
      {/* Centered 3-Role Emblems */}
      <div className="my-auto flex flex-col items-center text-center">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-16 max-w-5xl w-full place-items-center">
          {/* 1. Cafe Holder -> Owner Dashboard */}
          <button
            type="button"
            onClick={() => handleSelectRole("owner")}
            className="group relative flex flex-col items-center cursor-pointer focus:outline-none"
          >
            <span className="absolute -top-3 z-20 px-2.5 py-0.5 rounded-full bg-[#0f172a] border border-white/15 text-[10px] font-bold text-emerald-400 shadow">
              Active •
            </span>
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-[#f5b427] bg-slate-950 overflow-hidden p-0 flex items-center justify-center shadow-[0_0_24px_rgba(245,180,39,0.2)] group-hover:scale-105 transition">
              <img
                src="/home%20icon.jpg"
                alt="Cafe Holder"
                className="w-full h-full object-cover scale-110"
              />
            </div>
            <span className="mt-3 text-base font-extrabold text-white group-hover:text-[#f5b427] transition">
              Cafe Holder
            </span>
            <span className="mt-0.5 text-xs text-slate-300">Owner &amp; Admin Portal</span>
          </button>

          {/* 2. Customer -> Table Menu */}
          <button
            type="button"
            onClick={() => handleSelectRole("customer")}
            className="group relative flex flex-col items-center cursor-pointer focus:outline-none"
          >
            <span className="absolute -top-3 z-20 px-2.5 py-0.5 rounded-full bg-[#0f172a] border border-white/15 text-[10px] font-bold text-amber-300 shadow">
              Dine-in •
            </span>
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-[#f5b427] bg-slate-950 overflow-hidden p-0 flex items-center justify-center shadow-[0_0_24px_rgba(245,180,39,0.2)] group-hover:scale-105 transition">
              <img
                src="/customer%20logo.jpg"
                alt="Customer"
                className="w-full h-full object-cover scale-110"
              />
            </div>
            <span className="mt-3 text-base font-extrabold text-white group-hover:text-[#f5b427] transition">
              Customer
            </span>
            <span className="mt-0.5 text-xs text-slate-300">Table Menu &amp; Live Order</span>
          </button>

          {/* 3. Kitchen Staff -> Kitchen KDS */}
          <button
            type="button"
            onClick={() => handleSelectRole("kitchen")}
            className="group relative flex flex-col items-center cursor-pointer focus:outline-none"
          >
            <span className="absolute -top-3 z-20 px-2.5 py-0.5 rounded-full bg-[#0f172a] border border-white/15 text-[10px] font-bold text-sky-300 shadow">
              KDS •
            </span>
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-[#f5b427] bg-slate-950 overflow-hidden p-0 flex items-center justify-center shadow-[0_0_24px_rgba(245,180,39,0.2)] group-hover:scale-105 transition">
              <img
                src="/shef%20icon.jpg"
                alt="Kitchen Staff"
                className="w-full h-full object-cover scale-110"
              />
            </div>
            <span className="mt-3 text-base font-extrabold text-white group-hover:text-[#f5b427] transition">
              Kitchen Staff
            </span>
            <span className="mt-0.5 text-xs text-slate-300">Live Kitchen Display (KDS)</span>
          </button>
        </div>
      </div>

      {/* Bottom transparent English login quote */}
      <PageQuote page="login" />
    </div>
  );
}
