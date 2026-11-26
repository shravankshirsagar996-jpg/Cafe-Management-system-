import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import OwnerDashboard from "./pages/OwnerDashboard";
import CustomerMenuPage from "./pages/CustomerMenuPage";
import KitchenScreen from "./pages/KitchenScreen";
import BillingClosing from "./pages/BillingClosing";
import StaffPayroll from "./pages/StaffPayroll";
import MonthlyReports from "./pages/MonthlyReports";

const ALL_TABS = [
  { id: "dashboard", label: "Dashboard", roles: ["owner"] },
  { id: "customer_menu", label: "Menu", roles: ["customer"] },
  { id: "kitchen", label: "Kitchen KDS", roles: ["kitchen"] },
  { id: "billing", label: "Billing & Closing", roles: ["owner"] },
  { id: "staff", label: "Staff & Salary", roles: ["owner"] },
  { id: "reports", label: "Monthly Report", roles: ["owner"] },
];

function defaultTabForRole(role) {
  if (role === "customer") return "customer_menu";
  if (role === "kitchen") return "kitchen";
  if (role === "owner") return "dashboard";
  return "login";
}

function CafeShell() {
  const { user, logoutUser } = useAuth();
  const isLoggedIn = Boolean(user && user.role);
  const currentRole = isLoggedIn ? user.role : null;

  const visibleTabs = isLoggedIn
    ? ALL_TABS.filter((t) => t.roles.includes(currentRole))
    : [];

  const [activeTab, setActiveTab] = useState("login");

  useEffect(() => {
    if (!isLoggedIn) {
      setActiveTab("login");
      return;
    }
    const allowed = ALL_TABS.filter((t) => t.roles.includes(currentRole)).map((t) => t.id);
    if (!allowed.includes(activeTab) || activeTab === "login") {
      setActiveTab(defaultTabForRole(currentRole));
    }
  }, [isLoggedIn, currentRole]);

  const handleLoginSuccess = (loggedRole) => {
    setActiveTab(defaultTabForRole(loggedRole));
  };

  const handleLogout = () => {
    logoutUser();
    setActiveTab("login");
  };

  return (
    <div
      style={{
        backgroundImage:
          "linear-gradient(rgba(18, 22, 31, 0.52), rgba(18, 22, 31, 0.62)), url('/bg-cafe-lounge.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        color: "#f1f5f9",
      }}
      className="min-h-screen overflow-x-hidden"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800&family=Playfair+Display:ital,wght@0,600;1,500&display=swap');
      `}</style>

      <header className="sticky top-0 z-20 pt-4 px-4 pb-2">
        <div className="max-w-7xl mx-auto px-2 py-1.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <img
              src="/cafe-craft-logo.png"
              alt="Cafe Craft Logo"
              className="h-20 sm:h-24 w-auto max-w-[280px] object-contain rounded-lg shrink-0 drop-shadow"
            />
            <div>
              <h1
                style={{
                  color: "#f5e6c8",
                  fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif",
                  letterSpacing: "0.18em",
                }}
                className="text-base sm:text-lg font-bold leading-none drop-shadow"
              >
                CAFE CRAFT
              </h1>
              <p
                style={{
                  color: "#e6cfa3",
                  fontFamily: "'Playfair Display', Georgia, serif",
                  letterSpacing: "0.06em",
                }}
                className="text-xs italic mt-1 drop-shadow"
              >
                {isLoggedIn ? user.name + " • " + user.role : "Cafe & Dining Suite"}
              </p>
            </div>
          </div>

          {isLoggedIn && (
            <nav className="hidden md:flex items-center gap-1.5 overflow-x-auto">
              {visibleTabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  style={
                    activeTab === t.id
                      ? { backgroundColor: "#f5be52", color: "#111827" }
                      : { backgroundColor: "rgba(24, 29, 39, 0.45)", color: "#f1f5f9" }
                  }
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition backdrop-blur-sm"
                >
                  {t.label}
                </button>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <button
                type="button"
                onClick={handleLogout}
                style={{ backgroundColor: "rgba(24, 29, 39, 0.55)", color: "#f1f5f9" }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium transition backdrop-blur-sm"
              >
                Logout
              </button>
            )}
          </div>
        </div>

        {isLoggedIn && (
          <nav className="max-w-7xl mx-auto mt-2 flex md:hidden gap-1.5 overflow-x-auto pb-1">
            {visibleTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={
                  activeTab === t.id
                    ? { backgroundColor: "#f5be52", color: "#111827" }
                    : { backgroundColor: "rgba(24, 29, 39, 0.55)", color: "#e2e8f0" }
                }
                className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap"
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!isLoggedIn ? (
          <LoginPage onSuccess={handleLoginSuccess} />
        ) : (
          <>
            {activeTab === "dashboard" && currentRole === "owner" && <OwnerDashboard />}
            {activeTab === "customer_menu" && currentRole === "customer" && <CustomerMenuPage />}
            {activeTab === "kitchen" && currentRole === "kitchen" && <KitchenScreen />}
            {activeTab === "billing" && currentRole === "owner" && <BillingClosing />}
            {activeTab === "staff" && currentRole === "owner" && <StaffPayroll />}
            {activeTab === "reports" && currentRole === "owner" && <MonthlyReports />}
            {activeTab === "login" && <LoginPage onSuccess={handleLoginSuccess} />}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CafeShell />
    </AuthProvider>
  );
}