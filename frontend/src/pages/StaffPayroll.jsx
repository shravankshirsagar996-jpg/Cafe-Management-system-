import { useEffect, useMemo, useState } from "react";
import PageQuote from "../components/PageQuote";
import { loadStaffRoster, syncStaffRoster } from "../utils/liveCafeStore";

function formatInr(amount) {
  const num = Number(amount || 0);
  return "\u20B9" + num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function StaffSalary() {
  const [staffList, setStaffList] = useState(() => loadStaffRoster());
  const [name, setName] = useState("");
  const [role, setRole] = useState("waiter");
  const [shift, setShift] = useState("Morning");
  const [dailyRate, setDailyRate] = useState("");

  const [selectedStaffId, setSelectedStaffId] = useState(() => {
    const initial = loadStaffRoster();
    return initial[0] ? String(initial[0].id) : "";
  });
  const [attShift, setAttShift] = useState("Morning");
  const [attStatus, setAttStatus] = useState("Present");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const onSync = () => {
      const latest = loadStaffRoster();
      setStaffList(latest);
      if (!selectedStaffId && latest[0]) {
        setSelectedStaffId(String(latest[0].id));
      }
    };
    window.addEventListener("cafe-live-update", onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener("cafe-live-update", onSync);
      window.removeEventListener("storage", onSync);
    };
  }, [selectedStaffId]);

  const commitStaffList = (nextList, msg) => {
    setStaffList(nextList);
    syncStaffRoster(nextList);
    if (msg) setNotice(msg);
  };

  const handleAddStaff = (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    const rateNum = Number(dailyRate);
    if (!cleanName) {
      setNotice("Enter staff name.");
      return;
    }
    if (!rateNum || rateNum <= 0) {
      setNotice("Enter valid daily rate greater than \u20B90.");
      return;
    }
    const newMember = {
      id: Date.now(),
      name: cleanName,
      role: role.trim() || "waiter",
      shift,
      dailyRate: rateNum,
      presentDays: 1,
      lastStatus: "Present",
      lastShift: shift,
    };
    const nextList = [newMember, ...staffList];
    commitStaffList(nextList, "Added " + cleanName + " (" + newMember.role + ").");
    setSelectedStaffId(String(newMember.id));
    setName("");
    setDailyRate("");
  };

  const handleSaveAttendance = (e) => {
    e.preventDefault();
    if (!staffList.length) {
      setNotice("Add staff first to mark attendance.");
      return;
    }
    const targetId = selectedStaffId || String(staffList[0].id);
    const isPresent = attStatus === "Present";
    const nextList = staffList.map((m) => {
      if (String(m.id) !== String(targetId)) return m;
      const currentDays = Number(m.presentDays || 0);
      const updatedDays = isPresent ? currentDays + 1 : Math.max(0, currentDays);
      return {
        ...m,
        presentDays: updatedDays,
        lastStatus: attStatus,
        lastShift: attShift,
      };
    });
    const targetMember = nextList.find((m) => String(m.id) === String(targetId));
    commitStaffList(
      nextList,
      "Saved " + attStatus + " for " + (targetMember ? targetMember.name : "staff") + " (" + attShift + ")."
    );
  };

  const handleRemoveStaff = (id) => {
    const nextList = staffList.filter((m) => m.id !== id);
    commitStaffList(nextList, "Removed staff member.");
  };

  const totalEstimatedSalary = useMemo(() => {
    return staffList.reduce((acc, m) => {
      return acc + Number(m.dailyRate || 0) * Number(m.presentDays || 0);
    }, 0);
  }, [staffList]);

  const totalPresentDays = useMemo(() => {
    return staffList.reduce((acc, m) => acc + Number(m.presentDays || 0), 0);
  }, [staffList]);

  return (
    <div className="w-full space-y-6 text-white">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Transparent Panel: Add Staff & Shift + Mark Attendance */}
        <div className="rounded-3xl bg-white/10 backdrop-blur-[2px] border border-white/25 p-6 sm:p-7 shadow-2xl space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">Add Staff &amp; Shift</h2>
              {notice && (
                <span className="text-xs font-bold text-amber-200 bg-black/35 border border-amber-300/30 px-2.5 py-1 rounded-full">
                  {notice}
                </span>
              )}
            </div>

            <form onSubmit={handleAddStaff} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Staff Name"
                  className="w-full rounded-xl bg-white/15 border border-white/25 px-3.5 py-2.5 text-sm font-semibold text-white placeholder:text-slate-300 focus:outline-none focus:border-[#f5b427]"
                />
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Role (e.g. waiter)"
                  className="w-full rounded-xl bg-white/15 border border-white/25 px-3.5 py-2.5 text-sm font-semibold text-white placeholder:text-slate-300 focus:outline-none focus:border-[#f5b427]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                  className="w-full rounded-xl bg-[#111622]/85 border border-white/25 px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#f5b427]"
                >
                  <option value="Morning">Morning</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Night</option>
                </select>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(e.target.value)}
                  placeholder="Daily Rate (&#8377;)"
                  className="w-full rounded-xl bg-white/15 border border-white/25 px-3.5 py-2.5 text-sm font-semibold text-white placeholder:text-slate-300 focus:outline-none focus:border-[#f5b427]"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-[#f5b427] hover:bg-[#e5a318] text-slate-950 font-extrabold text-sm py-3 shadow-md transition cursor-pointer"
              >
                + Add Staff
              </button>
            </form>
          </div>

          <div className="pt-5 border-t border-white/15">
            <h3 className="text-lg font-extrabold text-white mb-3.5">Mark Attendance</h3>

            <form onSubmit={handleSaveAttendance} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="sm:col-span-1 rounded-xl bg-[#111622]/85 border border-white/25 px-3 py-2 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-[#f5b427]"
              >
                {staffList.length === 0 ? (
                  <option value="">No Staff</option>
                ) : (
                  staffList.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.name}
                    </option>
                  ))
                )}
              </select>

              <select
                value={attShift}
                onChange={(e) => setAttShift(e.target.value)}
                className="rounded-xl bg-[#111622]/85 border border-white/25 px-3 py-2 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-[#f5b427]"
              >
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
              </select>

              <select
                value={attStatus}
                onChange={(e) => setAttStatus(e.target.value)}
                className="rounded-xl bg-[#111622]/85 border border-white/25 px-3 py-2 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-[#f5b427]"
              >
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>

              <button
                type="submit"
                className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm px-4 py-2 shadow-sm transition cursor-pointer"
              >
                Save
              </button>
            </form>
          </div>
        </div>

        {/* Right Transparent Panel: Real-Time Monthly Salary Summary */}
        <div className="rounded-3xl bg-white/10 backdrop-blur-[2px] border border-white/25 p-6 sm:p-7 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                Monthly Salary Summary
              </h2>
              <span className="text-xs font-bold text-amber-300">
                {staffList.length} staff &bull; {totalPresentDays} days
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/15">
              <div className="rounded-2xl bg-black/20 border border-white/15 p-3.5">
                <div className="text-xs font-bold text-slate-300">Active Staff</div>
                <div className="mt-1 text-2xl font-black text-white">{staffList.length}</div>
              </div>
              <div className="rounded-2xl bg-black/20 border border-white/15 p-3.5">
                <div className="text-xs font-bold text-slate-300">Total Salary Payable</div>
                <div className="mt-1 text-2xl font-black text-[#f5b427]">
                  {formatInr(totalEstimatedSalary)}
                </div>
              </div>
            </div>

            {staffList.length === 0 ? (
              <div className="py-12 text-center text-sm font-semibold text-slate-300">
                No staff added yet. Add staff on the left to see real-time attendance &amp; salary.
              </div>
            ) : (
              <div className="mt-4 max-h-72 overflow-y-auto divide-y divide-white/15 pr-1">
                {staffList.map((member) => {
                  const days = Number(member.presentDays || 0);
                  const rate = Number(member.dailyRate || 0);
                  const totalPay = days * rate;
                  return (
                    <div
                      key={member.id}
                      className="py-3 flex items-center justify-between gap-3 text-xs sm:text-sm"
                    >
                      <div>
                        <div className="font-extrabold text-white">
                          {member.name}{" "}
                          <span className="text-amber-300 font-bold">
                            ({member.role} &bull; {member.lastShift || member.shift})
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 font-semibold mt-0.5">
                          Present: <span className="text-emerald-300 font-bold">{days}d</span> &bull; Rate:{" "}
                          {formatInr(rate)}/day &bull; Status: {member.lastStatus || "Present"}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-black text-[#f5b427]">{formatInr(totalPay)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveStaff(member.id)}
                          className="text-xs font-bold text-rose-300 hover:text-rose-200 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <PageQuote page="staff" />
    </div>
  );
}