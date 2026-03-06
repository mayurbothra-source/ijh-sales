import React, { useState, useEffect, useRef } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────

const SUPABASE_URL = "https://wvaqcxgpzhhpgitkbqkg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2YXFjeGdwemhocGdpdGticWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzU5MDEsImV4cCI6MjA4ODM1MTkwMX0.mG5hDRks5wsgT8_gI9n1WapGnCDjRaeaOhUwhL-oYlQ";

const sb = {
  from: (table) => ({
    _table: table,
    select: async (cols = "*") => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${cols}`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
      const data = await r.json();
      return { data, error: r.ok ? null : data };
    },
    insert: async (rows) => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(Array.isArray(rows) ? rows : [rows])
      });
      const data = r.status === 204 ? [] : await r.json();
      return { data, error: r.ok ? null : data };
    },
    upsert: async (rows, opts = {}) => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: `resolution=${opts.onConflict ? "merge-duplicates" : "merge-duplicates"},return=representation` },
        body: JSON.stringify(Array.isArray(rows) ? rows : [rows])
      });
      const data = r.status === 204 ? [] : await r.json();
      return { data, error: r.ok ? null : data };
    },
    update: async (row, match) => {
      const params = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
        method: "PATCH",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(row)
      });
      const data = r.status === 204 ? [] : await r.json();
      return { data, error: r.ok ? null : data };
    },
    delete: async (match) => {
      const params = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
      return { error: r.ok ? null : await r.json() };
    },
  }),
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PRODUCT_TYPES = [
  { type: "SMD 2835", subtypes: ["3V 0.2W", "3V 0.5W", "6V 0.2W", "Standard", "High Power", "Epistar Chip"] },
  { type: "SMD 3030", subtypes: ["1W", "3W", "High Lumen", "Standard"] },
  { type: "SMD 5050", subtypes: ["RGB", "White", "Warm White", "3-in-1"] },
  { type: "SMD 2030", subtypes: ["Standard", "High CRI", "Miniature"] },
  { type: "SMD 3014", subtypes: ["Standard", "High Brightness"] },
  { type: "COB LEDs", subtypes: ["10W", "20W", "30W", "50W", "100W", "Custom"] },
  { type: "LED Modules", subtypes: ["Round", "Square", "Linear", "Waterproof", "Custom Shape"] },
  { type: "Dome LED 353", subtypes: ["Red", "Green", "Blue", "White", "Yellow"] },
  { type: "Dome LED 5050", subtypes: ["RGB", "White", "Multicolor"] },
  { type: "RGB LED 5050", subtypes: ["Common Anode", "Common Cathode", "SMD", "DIP"] },
  { type: "DIP LED M3", subtypes: ["Red", "Green", "Blue", "White", "Yellow", "Infrared"] },
  { type: "DIP LED M5", subtypes: ["Red", "Green", "Blue", "White", "Yellow", "UV"] },
  { type: "Other", subtypes: ["Custom", "Prototype", "Misc"] },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const COLORS = ["#f59e0b","#10b981","#3b82f6","#ef4444","#8b5cf6","#ec4899","#06b6d4","#84cc16","#f97316","#6366f1","#14b8a6","#e11d48","#a78bfa"];

const USERS = [
  { id: "mgr1", name: "Mayur Bothra",       role: "admin",       title: "CEO",           password: "admin123" },
  { id: "bh1",  name: "Aakanksha Manglani", role: "biz_head",    title: "Business Head", password: "ijh@1234" },
  { id: "sp1",  name: "Komal Yadav",        role: "salesperson", title: "Sales Exec",    password: "ijh@1234" },
];

const SEED_ORDERS = [];

const SEED_VISITS = [];

const SEED_TARGETS = {
  bh1:  { monthly: 0 },
  sp1:  { monthly: 0 },
};

const DEFAULT_MIX_PARAMS = {
  wattages: ["0.06W", "0.2W", "0.5W", "1W", "1.5W", "2W"],
  colours: ["White", "RGBP", "Warm White", "Cool White", "Natural White"],
  voltages: ["3V", "6V", "9V", "18V", "36V", "72V"],
  packages: ["SMD 2835", "SMD 3030", "SMD 5050", "SMD 2030", "SMD 3014", "COB", "DIP M3", "DIP M5", "Dome LED", "LED Module"],
};

// Helper: get wattage options (unified list)
const getWattagesForPackage = (pkg, mixParams) => {
  return mixParams?.wattages || DEFAULT_MIX_PARAMS.wattages;
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [orders, setOrders] = useState([]);
  const [visits, setVisits] = useState([]);
  const [targets, setTargets] = useState({});
  const [mixParams, setMixParamsState] = useState(DEFAULT_MIX_PARAMS);
  const [users, setUsers] = useState(USERS);
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

  // ── Load all data from Supabase on mount ──
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [oRes, vRes, tRes, uRes, mRes] = await Promise.all([
        sb.from("orders").select("*"),
        sb.from("visits").select("*"),
        sb.from("targets").select("*"),
        sb.from("users").select("*"),
        sb.from("mix_params").select("*"),
      ]);
      if (oRes.error) throw new Error("orders: " + JSON.stringify(oRes.error));
      if (vRes.error) throw new Error("visits: " + JSON.stringify(vRes.error));
      if (tRes.error) throw new Error("targets: " + JSON.stringify(tRes.error));
      if (uRes.error) throw new Error("users: " + JSON.stringify(uRes.error));

      // Map snake_case DB columns → camelCase app fields for orders
      const mappedOrders = (oRes.data || []).map(o => ({
        id: o.id, userId: o.user_id, poNumber: o.po_number, poDate: o.po_date,
        deliveryDate: o.delivery_date, customer: o.customer, city: o.city,
        region: o.region, itemNo: o.item_no, package: o.package,
        productType: o.product_type, wattage: o.wattage, voltage: o.voltage,
        colour: o.colour, lumen: o.lumen, qty: o.qty, unitPrice: o.unit_price,
        value: o.value, month: o.month, year: o.year, date: o.date, notes: o.notes,
      }));

      const mappedVisits = (vRes.data || []).map(v => ({
        id: v.id, userId: v.user_id, customer: v.customer, city: v.city,
        lat: v.lat, lng: v.lng, date: v.date, notes: v.notes, orderId: v.order_id,
      }));

      // Targets: array of {user_id, monthly} → object {userId: {monthly}}
      const tObj = {};
      (tRes.data || []).forEach(t => { tObj[t.user_id] = { monthly: t.monthly }; });

      setOrders(mappedOrders);
      setVisits(mappedVisits);
      setTargets(tObj);

      // Users from DB take priority; fall back to hardcoded USERS if table empty
      if (uRes.data && uRes.data.length > 0) {
        setUsers(uRes.data.map(u => ({
          id: u.id, name: u.name, role: u.role, title: u.title, password: u.password
        })));
      }

      // Mix params
      if (mRes.data && mRes.data.length > 0) {
        try { setMixParamsState({ ...DEFAULT_MIX_PARAMS, ...mRes.data[0].params }); } catch {}
      }

      setDbError(null);
    } catch (e) {
      setDbError(e.message);
    }
    setLoading(false);
  };

  // ── Persist orders to Supabase ──
  const saveOrders = async (newOrders) => {
    setOrders(newOrders);
  };

  const addOrders = async (items) => {
    const rows = items.map(o => ({
      id: o.id, user_id: o.userId, po_number: o.poNumber || null,
      po_date: o.poDate || null, delivery_date: o.deliveryDate || null,
      customer: o.customer, city: o.city || null, region: o.region || null,
      item_no: o.itemNo, package: o.package, product_type: o.productType,
      wattage: o.wattage, voltage: o.voltage || null, colour: o.colour || null,
      lumen: o.lumen || null, qty: o.qty, unit_price: o.unitPrice || 0,
      value: o.value || 0, month: o.month, year: o.year, date: o.date, notes: o.notes || "",
    }));
    await sb.from("orders").insert(rows);
    setOrders(prev => [...prev, ...items]);
  };

  const updateOrders = async (updatedItems) => {
    for (const o of updatedItems) {
      await sb.from("orders").update({
        po_number: o.poNumber || null, po_date: o.poDate || null,
        delivery_date: o.deliveryDate || null, customer: o.customer,
        city: o.city || null, region: o.region || null, item_no: o.itemNo,
        package: o.package, product_type: o.productType, wattage: o.wattage,
        voltage: o.voltage || null, colour: o.colour || null, lumen: o.lumen || null,
        qty: o.qty, unit_price: o.unitPrice || 0, value: o.value || 0, notes: o.notes || "",
        po_date: o.poDate || null, delivery_date: o.deliveryDate || null,
      }, { id: o.id });
    }
    setOrders(prev => prev.map(o => {
      const updated = updatedItems.find(u => u.id === o.id);
      return updated || o;
    }));
  };

  const deleteOrders = async (ids) => {
    for (const id of ids) await sb.from("orders").delete({ id });
    setOrders(prev => prev.filter(o => !ids.includes(o.id)));
  };

  // ── Persist visits ──
  const addVisit = async (visit) => {
    await sb.from("visits").insert({
      id: visit.id, user_id: visit.userId, customer: visit.customer,
      city: visit.city || null, lat: visit.lat || null, lng: visit.lng || null,
      date: visit.date, notes: visit.notes || "", order_id: visit.orderId || null,
    });
    setVisits(prev => [...prev, visit]);
  };

  // ── Persist targets ──
  const saveTarget = async (userId, monthly) => {
    await sb.from("targets").upsert({ user_id: userId, monthly }, { onConflict: "user_id" });
    setTargets(prev => ({ ...prev, [userId]: { monthly } }));
  };

  const setTargets2 = (updaterOrObj) => {
    if (typeof updaterOrObj === "function") {
      setTargets(prev => {
        const next = updaterOrObj(prev);
        // Find what changed and persist
        Object.entries(next).forEach(([uid, t]) => {
          if (!prev[uid] || prev[uid].monthly !== t.monthly) {
            sb.from("targets").upsert({ user_id: uid, monthly: t.monthly }, { onConflict: "user_id" });
          }
        });
        return next;
      });
    } else {
      setTargets(updaterOrObj);
    }
  };

  // ── Persist users ──
  const saveUsers = async (updater) => {
    const newUsers = typeof updater === "function" ? updater(users) : updater;
    setUsers(newUsers);
    // Upsert all changed users
    for (const u of newUsers) {
      await sb.from("users").upsert(
        { id: u.id, name: u.name, role: u.role, title: u.title, password: u.password },
        { onConflict: "id" }
      );
    }
    // Delete removed users
    const newIds = newUsers.map(u => u.id);
    for (const u of users) {
      if (!newIds.includes(u.id)) await sb.from("users").delete({ id: u.id });
    }
  };

  // ── Persist mixParams ──
  const setMixParams = async (updater) => {
    const next = typeof updater === "function" ? updater(mixParams) : updater;
    setMixParamsState(next);
    await sb.from("mix_params").upsert({ id: "global", params: next }, { onConflict: "id" });
  };

  const syncedCurrentUser = currentUser
    ? { ...currentUser, ...(users.find(u => u.id === currentUser.id) || {}) }
    : null;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
      <div style={{ fontSize: 36, marginBottom: 16 }}>💡</div>
      <p style={{ color: "#f59e0b", fontWeight: 700, fontSize: 18, margin: "0 0 8px" }}>IJH Sales</p>
      <p style={{ color: "#475569", fontSize: 13 }}>Connecting to database…</p>
      {dbError && (
        <div style={{ marginTop: 20, padding: "12px 20px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, maxWidth: 400, textAlign: "center" }}>
          <p style={{ color: "#ef4444", fontSize: 12, margin: 0 }}>⚠️ Database error: {dbError}</p>
          <button onClick={loadAll} style={{ marginTop: 10, padding: "6px 16px", background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 8, color: "#ef4444", cursor: "pointer", fontSize: 12 }}>Retry</button>
        </div>
      )}
    </div>
  );

  if (!syncedCurrentUser) return <Login onLogin={setCurrentUser} users={users} />;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0f172a", fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <Sidebar currentUser={syncedCurrentUser} page={page} setPage={setPage} onLogout={() => setCurrentUser(null)} users={users} setUsers={saveUsers} />
      <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        {page === "dashboard" && <Dashboard orders={orders} visits={visits} targets={targets} currentUser={syncedCurrentUser} mixParams={mixParams} setMixParams={setMixParams} users={users} />}
        {page === "orders" && <Orders orders={orders} addOrders={addOrders} updateOrders={updateOrders} deleteOrders={deleteOrders} currentUser={syncedCurrentUser} mixParams={mixParams} users={users} />}
        {page === "visits" && <Visits visits={visits} addVisit={addVisit} orders={orders} currentUser={syncedCurrentUser} users={users} />}
        {page === "targets" && ["admin","biz_head"].includes(syncedCurrentUser.role) && <Targets orders={orders} targets={targets} setTargets={setTargets2} saveTarget={saveTarget} currentUser={syncedCurrentUser} users={users} setUsers={saveUsers} />}
      </main>
    </div>
  );
}



const Icon = ({ name, size = 18 }) => {
  const icons = {
    dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
    orders: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
    visit: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
    target: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z",
    logout: "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z",
    add: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
    map: "M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z",
    user: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    camera: "M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M9 3L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-3.17L15 3H9z",
    location: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
    rupee: "M15 18l-4-7H7v-2h3.5c1.93 0 3.5-1.57 3.5-3.5S12.43 2 10.5 2H6v2h4.5C11.88 4 13 5.12 13 6.5S11.88 9 10.5 9H7v2h3.5l4 7H15z",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d={icons[name] || icons.dashboard} />
    </svg>
  );
};

// ─── FORMAT HELPERS ───────────────────────────────────────────────────────────

const fmt = (n) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(1)}K` : `₹${n}`;
const fmtQty = (n) => n >= 100000 ? `${(n/100000).toFixed(1)}L` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : n;

// ─── LOGIN ────────────────────────────────────────────────────────────────────

function Login({ onLogin, users }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    const user = users.find(u => u.name.toLowerCase().includes(username.toLowerCase()) && u.password === password);
    if (user) { onLogin(user); setError(""); }
    else setError("Invalid credentials. Try again.");
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "48px 40px", width: 380, boxShadow: "0 40px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, background: "linear-gradient(135deg, #f59e0b, #ef4444)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 26 }}>💡</div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>Indo Japan Horologicals</h1>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>Sales Force Dashboard</p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500, letterSpacing: 1, textTransform: "uppercase" }}>Name</label>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Your name..." style={inputStyle} onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500, letterSpacing: 1, textTransform: "uppercase" }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>
        {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 16, textAlign: "center" }}>{error}</p>}
        <button onClick={handleLogin} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #f59e0b, #f97316)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", letterSpacing: 0.5 }}>Sign In →</button>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────

function Sidebar({ currentUser, page, setPage, onLogout, users, setUsers }) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "orders", label: "Orders", icon: "orders" },
    { id: "visits", label: "Visit Log", icon: "visit" },
    ...(["admin","biz_head"].includes(currentUser.role) ? [{ id: "targets", label: "Targets", icon: "target" }] : []),
  ];

  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const closePwModal = () => {
    setShowPwModal(false);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setPwError(""); setPwSuccess(false);
  };

  const handleChangePw = () => {
    const user = users.find(u => u.id === currentUser.id);
    if (currentPw !== user.password) { setPwError("Current password is incorrect."); return; }
    if (newPw.length < 4) { setPwError("New password must be at least 4 characters."); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match."); return; }
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, password: newPw } : u));
    setPwError(""); setPwSuccess(true);
    setTimeout(closePwModal, 1500);
  };

  return (
    <aside style={{ width: 220, background: "#0d1526", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", padding: "24px 0" }}>
      <div style={{ padding: "0 20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 22, marginBottom: 4 }}>💡</div>
        <p style={{ color: "#f59e0b", fontWeight: 700, fontSize: 13, margin: 0 }}>IJH Sales</p>
        <p style={{ color: "#475569", fontSize: 11, margin: "2px 0 0" }}>Indo Japan Horologicals</p>
      </div>
      <nav style={{ flex: 1, padding: "16px 12px" }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setPage(item.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "none", background: page === item.id ? "rgba(245,158,11,0.15)" : "transparent", color: page === item.id ? "#f59e0b" : "#64748b", cursor: "pointer", fontSize: 13, fontWeight: page === item.id ? 600 : 400, marginBottom: 4, transition: "all 0.15s" }}>
            <Icon name={item.icon} size={16} />
            {item.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #f59e0b, #ef4444)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>{currentUser.name[0]}</div>
          <div>
            <p style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600, margin: 0 }}>{currentUser.name.split(" ")[0]}</p>
            <p style={{ color: "#475569", fontSize: 10, margin: 0 }}>{currentUser.title}</p>
          </div>
        </div>
        <button onClick={() => setShowPwModal(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, border: "none", background: "rgba(99,102,241,0.1)", color: "#818cf8", cursor: "pointer", fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
          🔑 Change Password
        </button>
        <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, border: "none", background: "rgba(239,68,68,0.1)", color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
          <Icon name="logout" size={14} /> Sign Out
        </button>
      </div>

      {showPwModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "#131f35", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 28, width: "min(90vw, 380px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ color: "#f1f5f9", fontSize: 16, fontWeight: 700, margin: 0 }}>🔑 Change Password</h2>
              <button onClick={closePwModal} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}>
                <Icon name="close" size={13} />
              </button>
            </div>
            <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 18px" }}>Logged in as <span style={{ color: "#94a3b8", fontWeight: 600 }}>{currentUser.name}</span></p>
            {pwSuccess ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 28, margin: "0 0 8px" }}>✅</p>
                <p style={{ color: "#10b981", fontWeight: 600, margin: 0 }}>Password updated successfully!</p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <FormField label="Current Password">
                    <input type="password" value={currentPw} onChange={e => { setCurrentPw(e.target.value); setPwError(""); }} style={inputStyle} placeholder="Enter current password" />
                  </FormField>
                  <FormField label="New Password">
                    <input type="password" value={newPw} onChange={e => { setNewPw(e.target.value); setPwError(""); }} style={inputStyle} placeholder="Min. 4 characters" />
                  </FormField>
                  <FormField label="Confirm New Password">
                    <input type="password" value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setPwError(""); }} onKeyDown={e => e.key === "Enter" && handleChangePw()} style={inputStyle} placeholder="Repeat new password" />
                  </FormField>
                </div>
                {pwError && <p style={{ color: "#ef4444", fontSize: 12, margin: "10px 0 0" }}>{pwError}</p>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                  <button onClick={closePwModal} style={{ padding: "10px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>Cancel</button>
                  <button onClick={handleChangePw} disabled={!currentPw || !newPw || !confirmPw}
                    style={{ padding: "10px 18px", background: currentPw && newPw && confirmPw ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(255,255,255,0.05)", border: "none", borderRadius: 10, color: currentPw && newPw && confirmPw ? "#fff" : "#475569", fontWeight: 600, fontSize: 13, cursor: currentPw && newPw && confirmPw ? "pointer" : "not-allowed" }}>
                    Update Password
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function Dashboard({ orders, visits, targets, currentUser, mixParams, setMixParams, users }) {
  const isManager = ["admin","biz_head"].includes(currentUser.role);
  const myOrders = isManager ? orders : orders.filter(o => o.userId === currentUser.id);
  const myVisits = isManager ? visits : visits.filter(v => v.userId === currentUser.id);

  const totalValue = myOrders.reduce((s, o) => s + o.value, 0);
  const totalQty = myOrders.reduce((s, o) => s + o.qty, 0);
  const totalVisits = myVisits.length;

  const monthlyData = MONTHS.map((m, i) => {
    const mo = myOrders.filter(o => o.month === i);
    return { month: m, value: mo.reduce((s, o) => s + o.value, 0), qty: mo.reduce((s, o) => s + o.qty, 0), orders: mo.length };
  });

  const productMap = {};
  myOrders.forEach(o => { productMap[o.productType] = (productMap[o.productType] || 0) + o.value; });
  const productData = Object.entries(productMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const custMap = {};
  myOrders.forEach(o => { custMap[o.customer] = (custMap[o.customer] || 0) + o.value; });
  const topCustomers = Object.entries(custMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

  const regionMap = {};
  myOrders.forEach(o => { regionMap[o.region || "Unknown"] = (regionMap[o.region || "Unknown"] || 0) + o.value; });
  const regionData = Object.entries(regionMap).map(([name, value]) => ({ name, value }));

  let targetVal = 0;
  if (isManager) { Object.values(targets).forEach(t => { targetVal += (t.monthly * 3); }); }
  else { targetVal = (targets[currentUser.id]?.monthly || 0) * 3; }
  const achievePct = targetVal > 0 ? Math.min(100, Math.round((totalValue / targetVal) * 100)) : 0;

  const now = new Date();
  const curMonthOrders = myOrders.filter(o => o.month === now.getMonth() && o.year === now.getFullYear());
  const curMonthVal = curMonthOrders.reduce((s, o) => s + o.value, 0);
  const curMonthTarget = isManager ? Object.values(targets).reduce((s, t) => s + t.monthly, 0) : (targets[currentUser.id]?.monthly || 0);

  const allPackages = [...new Set([...(mixParams.packages || DEFAULT_MIX_PARAMS.packages), ...myOrders.map(o => o.package).filter(Boolean)])];

  const wattageByPackage = allPackages.map(pkg => {
    const pkgOrders = myOrders.filter(o => o.package === pkg);
    // Union standard wattage list with any custom wattages actually present in orders
    const standardWattages = mixParams?.wattages || DEFAULT_MIX_PARAMS.wattages;
    const orderWattages = [...new Set(pkgOrders.map(o => o.wattage).filter(Boolean))];
    const allWattages = [...new Set([...standardWattages, ...orderWattages])];
    const breakdown = allWattages.map(w => {
      const matched = pkgOrders.filter(o => o.wattage === w);
      return { name: w, qty: matched.reduce((s, o) => s + o.qty, 0), value: matched.reduce((s, o) => s + o.value, 0) };
    }).filter(d => d.qty > 0);
    return { pkg, breakdown, totalQty: pkgOrders.reduce((s, o) => s + o.qty, 0), totalValue: pkgOrders.reduce((s, o) => s + o.value, 0) };
  }).filter(p => p.totalQty > 0);
  const allColours = [...new Set([...(mixParams.colours || DEFAULT_MIX_PARAMS.colours), ...myOrders.map(o => o.colour).filter(Boolean)])];
  const colourData = allColours.map(c => {
    const matched = myOrders.filter(o => o.colour === c);
    return { name: c, qty: matched.reduce((s, o) => s + o.qty, 0), value: matched.reduce((s, o) => s + o.value, 0) };
  }).filter(d => d.qty > 0);
  const allVoltages = [...new Set([...(mixParams.voltages || DEFAULT_MIX_PARAMS.voltages), ...myOrders.map(o => o.voltage).filter(Boolean)])];
  const voltageData = allVoltages.map(v => {
    const matched = myOrders.filter(o => o.voltage === v);
    return { name: v, qty: matched.reduce((s, o) => s + o.qty, 0), value: matched.reduce((s, o) => s + o.value, 0) };
  }).filter(d => d.qty > 0);
  const packageData = allPackages.map(p => {
    const matched = myOrders.filter(o => o.package === p);
    return { name: p, qty: matched.reduce((s, o) => s + o.qty, 0), value: matched.reduce((s, o) => s + o.value, 0) };
  }).filter(d => d.qty > 0);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: "#f1f5f9", fontSize: 24, fontWeight: 700, margin: 0 }}>
          {isManager ? "Sales Overview" : "My Dashboard"}
        </h1>
        <p style={{ color: "#475569", fontSize: 13, margin: "4px 0 0" }}>
          {isManager ? "All salespeople · " : ""}{MONTHS[now.getMonth()]} {now.getFullYear()}
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Revenue", value: fmt(totalValue), sub: `${MONTHS[now.getMonth()]}: ${fmt(curMonthVal)}`, color: "#f59e0b", icon: "rupee" },
          { label: "Units Sold", value: fmtQty(totalQty), sub: `${myOrders.length} orders`, color: "#10b981", icon: "orders" },
          { label: "Customer Visits", value: totalVisits, sub: `${myVisits.filter(v => v.date >= `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`).length} this month`, color: "#3b82f6", icon: "map" },
          { label: "Target Achievement", value: `${achievePct}%`, sub: `${fmt(curMonthVal)} / ${fmt(curMonthTarget)}`, color: achievePct >= 80 ? "#10b981" : achievePct >= 50 ? "#f59e0b" : "#ef4444", icon: "target" },
        ].map((kpi, i) => (
          <div key={i} style={{ background: "#131f35", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <p style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, margin: 0 }}>{kpi.label}</p>
              <div style={{ color: kpi.color, opacity: 0.8 }}><Icon name={kpi.icon} size={16} /></div>
            </div>
            <p style={{ color: kpi.color, fontSize: 26, fontWeight: 700, margin: "0 0 4px", fontFamily: "DM Mono" }}>{kpi.value}</p>
            <p style={{ color: "#475569", fontSize: 11, margin: 0 }}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <ChartCard title="Monthly Revenue Trend">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
              <Tooltip contentStyle={{ background: "#1e2d4a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e2e8f0" }} formatter={v => [fmt(v), "Revenue"]} />
              <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Product Type Mix">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={productData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                {productData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#1e2d4a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} formatter={v => [fmt(v)]} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: "#64748b" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── PRODUCT MIX ANALYSIS ── */}
      <ProductMixAnalysis
        wattageByPackage={wattageByPackage}
        colourData={colourData}
        voltageData={voltageData}
        packageData={packageData}
        mixParams={mixParams}
        setMixParams={setMixParams}
        isManager={isManager}
      />

      {/* Charts Row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <ChartCard title="Top Customers">
          <div style={{ marginTop: 8 }}>
            {topCustomers.length === 0 ? <p style={{ color: "#475569", fontSize: 12, textAlign: "center", padding: 16 }}>No data yet</p> :
            topCustomers.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ color: "#475569", fontSize: 11, fontFamily: "DM Mono", width: 16 }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ color: "#cbd5e1", fontSize: 12, fontWeight: 500 }}>{c.name}</span>
                    <span style={{ color: "#f59e0b", fontSize: 12, fontFamily: "DM Mono" }}>{fmt(c.value)}</span>
                  </div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${(c.value / topCustomers[0].value) * 100}%`, background: COLORS[i], borderRadius: 2 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
        <ChartCard title="Region-wise Sales">
          <div style={{ marginTop: 8 }}>
            {regionData.length === 0 ? <p style={{ color: "#475569", fontSize: 12, textAlign: "center", padding: 16 }}>No data yet</p> :
            regionData.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[i] }} />
                  <span style={{ color: "#cbd5e1", fontSize: 13 }}>{r.name}</span>
                </div>
                <span style={{ color: "#f59e0b", fontSize: 13, fontFamily: "DM Mono" }}>{fmt(r.value)}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

// ─── PRODUCT MIX ANALYSIS PANEL ───────────────────────────────────────────────

function ProductMixAnalysis({ wattageByPackage, colourData, voltageData, packageData, mixParams, setMixParams, isManager }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [selectedPkg, setSelectedPkg] = useState(null);

  // Auto-select first available package
  const activePkg = selectedPkg && wattageByPackage.find(p => p.pkg === selectedPkg)
    ? selectedPkg
    : wattageByPackage[0]?.pkg || null;

  const activeWattageData = wattageByPackage.find(p => p.pkg === activePkg)?.breakdown || [];

  const openEdit = () => { setDraft(JSON.parse(JSON.stringify(mixParams))); setEditing(true); };
  const saveEdit = () => { setMixParams(draft); setEditing(false); };

  const addItem = (key, val) => {
    const trimmed = val.trim();
    if (!trimmed || (draft[key] || []).includes(trimmed)) return;
    setDraft(d => ({ ...d, [key]: [...(d[key] || []), trimmed] }));
  };
  const removeItem = (key, idx) => setDraft(d => ({ ...d, [key]: d[key].filter((_, i) => i !== idx) }));

  const MixBar = ({ data, colorSet }) => {
    const total = data.reduce((s, d) => s + d.qty, 0) || 1;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 10 }}>
        {data.length === 0
          ? <p style={{ color: "#475569", fontSize: 12, fontStyle: "italic", margin: "8px 0" }}>No orders logged for this selection yet</p>
          : data.map((d, i) => {
          const pct = Math.round((d.qty / total) * 100);
          return (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ color: "#cbd5e1", fontSize: 12, fontWeight: 500 }}>{d.name}</span>
                <span style={{ color: "#94a3b8", fontSize: 11, fontFamily: "DM Mono" }}>{fmtQty(d.qty)} · {fmt(d.value)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 7, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: colorSet[i % colorSet.length], borderRadius: 4, transition: "width 0.5s ease" }} />
                </div>
                <span style={{ color: colorSet[i % colorSet.length], fontSize: 11, fontFamily: "DM Mono", width: 34, textAlign: "right" }}>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ background: "#131f35", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 16, padding: "20px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <p style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, margin: 0 }}>Product Mix Analysis</p>
          <p style={{ color: "#475569", fontSize: 11, margin: "3px 0 0" }}>LED Package · Wattage · Colour · Voltage</p>
        </div>
        {isManager && (
          <button onClick={openEdit} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8, color: "#818cf8", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
            ✎ Edit Parameters
          </button>
        )}
      </div>

      {/* 2×2 grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* LED Package */}
        <div style={{ background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.18)", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#06b6d4" }} />
            <span style={{ color: "#06b6d4", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>LED Package</span>
          </div>
          <MixBar data={packageData} colorSet={["#06b6d4","#0891b2","#22d3ee","#67e8f9","#a5f3fc","#0e7490","#155e75","#cffafe","#7dd3fc","#38bdf8"]} />
        </div>

        {/* Wattage — per-package tabbed */}
        <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
            <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>Wattage</span>
            <span style={{ color: "#475569", fontSize: 10, marginLeft: 4 }}>per package</span>
          </div>
          {/* Package selector tabs */}
          {wattageByPackage.length > 0 ? (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                {wattageByPackage.map(p => (
                  <button key={p.pkg} onClick={() => setSelectedPkg(p.pkg)}
                    style={{ padding: "3px 9px", borderRadius: 20, border: `1px solid ${activePkg === p.pkg ? "#f59e0b" : "rgba(255,255,255,0.08)"}`, background: activePkg === p.pkg ? "rgba(245,158,11,0.2)" : "transparent", color: activePkg === p.pkg ? "#f59e0b" : "#64748b", cursor: "pointer", fontSize: 10, fontWeight: activePkg === p.pkg ? 700 : 400, transition: "all 0.15s" }}>
                    {p.pkg}
                  </button>
                ))}
              </div>
              <MixBar data={activeWattageData} colorSet={["#f59e0b", "#fbbf24", "#fde68a", "#fef3c7", "#fb923c", "#f97316"]} />
            </>
          ) : (
            <p style={{ color: "#475569", fontSize: 12, fontStyle: "italic", marginTop: 8 }}>No orders logged yet</p>
          )}
        </div>

        {/* Colour */}
        <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.12)", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
            <span style={{ color: "#10b981", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>Colour</span>
          </div>
          <MixBar data={colourData} colorSet={["#10b981", "#34d399", "#6ee7b7", "#f472b6", "#c084fc", "#a3e635"]} />
        </div>

        {/* Voltage */}
        <div style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#818cf8" }} />
            <span style={{ color: "#818cf8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>Voltage</span>
          </div>
          <MixBar data={voltageData} colorSet={["#818cf8", "#6366f1", "#4f46e5", "#a78bfa", "#7c3aed", "#c084fc"]} />
        </div>

      </div>

      {/* Edit Parameters Modal */}
      {editing && draft && (
        <Modal title="Edit Product Mix Parameters" onClose={() => setEditing(false)}>
          <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 20px" }}>Configure standard wattage options, plus Colour and Voltage lists.</p>

          {[
            { key: "wattages", label: "Wattage Options", color: "#f59e0b", placeholder: "e.g. 3W" },
            { key: "colours", label: "Colour Options", color: "#10b981", placeholder: "e.g. Warm White" },
            { key: "voltages", label: "Voltage Options", color: "#818cf8", placeholder: "e.g. 48V" },
          ].map(({ key, label, color, placeholder }) => {
            const [newVal, setNewVal] = useState("");
            return (
              <div key={key} style={{ marginBottom: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, color, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                  {label}
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  {(draft[key] || []).map((v, i) => (
                    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 20, color, fontSize: 12, fontWeight: 500 }}>
                      {v}
                      <button onClick={() => removeItem(key, i)} style={{ background: "none", border: "none", color, cursor: "pointer", padding: 0, lineHeight: 1, fontSize: 14, opacity: 0.7 }}>×</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={newVal} onChange={e => setNewVal(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { addItem(key, newVal); setNewVal(""); }}}
                    placeholder={placeholder} style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={() => { addItem(key, newVal); setNewVal(""); }}
                    style={{ padding: "10px 14px", background: `${color}22`, border: `1px solid ${color}44`, borderRadius: 10, color, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>+ Add</button>
                </div>
              </div>
            );
          })}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={() => setEditing(false)} style={{ padding: "10px 20px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>Cancel</button>
            <button onClick={saveEdit} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Save Parameters</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{ background: "#131f35", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "20px 22px" }}>
      <p style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 16px" }}>{title}</p>
      {children}
    </div>
  );
}

// ─── ORDER FORM (multi-item PO) ───────────────────────────────────────────────

const makeBlankItem = () => ({
  packageMode: "dropdown", packageDropdown: "", packageCustom: "",
  productType: "",
  wattageMode: "dropdown", wattageDropdown: "", wattageCustom: "",
  voltage: "",
  cctMode: "dropdown", cctDropdown: "", cctCustom: "",
  lumen: "", qty: "", unitPrice: "",
});

function NewOrderModal({ onClose, onSave, mixParams }) {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const [step, setStep] = useState("form"); // "form" | "review"
  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState(dateStr);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [customer, setCustomer] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("North");
  const [numItems, setNumItems] = useState(1);
  const [activeTab, setActiveTab] = useState(0);
  const [items, setItems] = useState([makeBlankItem()]);

  const regions = ["North", "South", "East", "West", "Central", "Northeast"];

  // Keep items array in sync with numItems
  const handleNumItems = (n) => {
    const count = parseInt(n);
    setNumItems(count);
    setItems(prev => {
      const next = [...prev];
      while (next.length < count) next.push(makeBlankItem());
      return next.slice(0, count);
    });
    setActiveTab(prev => Math.min(prev, count - 1));
  };

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: value };
      if (field === "packageMode" || field === "packageDropdown" || field === "packageCustom") {
        updated.wattageDropdown = ""; updated.wattageCustom = "";
      }
      return updated;
    }));
  };

  const packageValue = (item) => item.packageMode === "custom" ? item.packageCustom : item.packageDropdown;
  const cctValue = (item) => item.cctMode === "custom" ? item.cctCustom : item.cctDropdown;
  const wattageValue = (item) => item.wattageMode === "custom" ? item.wattageCustom : item.wattageDropdown;
  const itemComplete = (it) => packageValue(it) && wattageValue(it) && it.qty;
  const allComplete = customer.trim() && items.every(itemComplete);

  const handleSave = () => {
    const saved = items.map((it, i) => {
      const qty = parseInt(it.qty) || 0;
      const unitPrice = parseFloat(it.unitPrice) || 0;
      return {
        id: `o${Date.now()}_${i}`,
        poNumber, poDate, deliveryDate, customer, city, region,
        itemNo: i + 1,
        package: packageValue(it),
        productType: it.productType || packageValue(it),
        wattage: wattageValue(it),
        voltage: it.voltage,
        colour: cctValue(it),
        lumen: it.lumen,
        qty, unitPrice,
        value: qty * unitPrice,
        month: now.getMonth(), year: now.getFullYear(), date: dateStr,
        notes: "",
      };
    });
    onSave(saved);
  };

  const ItemTab = ({ idx }) => {
    const it = items[idx];
    const colours = mixParams?.colours || DEFAULT_MIX_PARAMS.colours;
    const voltages = mixParams?.voltages || DEFAULT_MIX_PARAMS.voltages;
    const packages = mixParams?.packages || DEFAULT_MIX_PARAMS.packages;

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, paddingTop: 16 }}>
        {/* Package — dropdown + custom */}
        <FormField label="Package" required style={{ gridColumn: "1/-1" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
              {["dropdown", "custom"].map(mode => (
                <button key={mode} onClick={() => updateItem(idx, "packageMode", mode)}
                  style={{ padding: "10px 14px", background: it.packageMode === mode ? "rgba(6,182,212,0.2)" : "transparent", border: "none", color: it.packageMode === mode ? "#06b6d4" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: it.packageMode === mode ? 600 : 400 }}>
                  {mode === "dropdown" ? "Standard" : "Special"}
                </button>
              ))}
            </div>
            {it.packageMode === "dropdown"
              ? <select value={it.packageDropdown} onChange={e => updateItem(idx, "packageDropdown", e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                  <option value="">— Select Package —</option>
                  {packages.map(p => <option key={p}>{p}</option>)}
                </select>
              : <input value={it.packageCustom} onChange={e => updateItem(idx, "packageCustom", e.target.value)}
                  placeholder="e.g. COB 3030, Custom Module…" style={{ ...inputStyle, flex: 1 }} />
            }
          </div>
        </FormField>

        {/* Product Type — free text */}
        <FormField label="Product Type" style={{ gridColumn: "1/-1" }}>
          <input value={it.productType} onChange={e => updateItem(idx, "productType", e.target.value)}
            placeholder="e.g. High Power, RGB, Epistar Chip…" style={inputStyle} />
        </FormField>

        {/* Wattage — dropdown + custom */}
        <FormField label="Wattage" required style={{ gridColumn: "1/-1" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
              {["dropdown", "custom"].map(mode => (
                <button key={mode} onClick={() => updateItem(idx, "wattageMode", mode)}
                  style={{ padding: "10px 14px", background: it.wattageMode === mode ? "rgba(245,158,11,0.2)" : "transparent", border: "none", color: it.wattageMode === mode ? "#f59e0b" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: it.wattageMode === mode ? 600 : 400 }}>
                  {mode === "dropdown" ? "Standard" : "Special"}
                </button>
              ))}
            </div>
            {it.wattageMode === "dropdown"
              ? <select value={it.wattageDropdown} onChange={e => updateItem(idx, "wattageDropdown", e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                  <option value="">— Select Wattage —</option>
                  {(mixParams?.wattages || DEFAULT_MIX_PARAMS.wattages).map(w => <option key={w}>{w}</option>)}
                </select>
              : <input value={it.wattageCustom} onChange={e => updateItem(idx, "wattageCustom", e.target.value)}
                  placeholder="e.g. 3W, 5W, 10W, 0.1W…" style={{ ...inputStyle, flex: 1 }} />
            }
          </div>
        </FormField>

        {/* Voltage */}
        <FormField label="Voltage">
          <select value={it.voltage} onChange={e => updateItem(idx, "voltage", e.target.value)} style={selectStyle}>
            <option value="">— Select —</option>
            {voltages.map(v => <option key={v}>{v}</option>)}
          </select>
        </FormField>

        {/* CCT / Colour — dropdown + custom toggle */}
        <FormField label="CCT / Colour" style={{ gridColumn: "1/-1" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            {/* Toggle */}
            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
              {["dropdown", "custom"].map(mode => (
                <button key={mode} onClick={() => updateItem(idx, "cctMode", mode)}
                  style={{ padding: "10px 14px", background: it.cctMode === mode ? "rgba(16,185,129,0.2)" : "transparent", border: "none", color: it.cctMode === mode ? "#10b981" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: it.cctMode === mode ? 600 : 400 }}>
                  {mode === "dropdown" ? "List" : "Custom"}
                </button>
              ))}
            </div>
            {it.cctMode === "dropdown"
              ? <select value={it.cctDropdown} onChange={e => updateItem(idx, "cctDropdown", e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                  <option value="">— Select CCT / Colour —</option>
                  {colours.map(c => <option key={c}>{c}</option>)}
                </select>
              : <input value={it.cctCustom} onChange={e => updateItem(idx, "cctCustom", e.target.value)}
                  placeholder="e.g. 3000K, 4000K, RGBW…" style={{ ...inputStyle, flex: 1 }} />
            }
          </div>
        </FormField>

        {/* Lumen */}
        <FormField label="Lumen Output">
          <input value={it.lumen} onChange={e => updateItem(idx, "lumen", e.target.value)}
            placeholder="e.g. 120 lm, 50-60 lm" style={inputStyle} />
        </FormField>

        {/* Order Quantity */}
        <FormField label="Order Quantity" required>
          <input type="number" value={it.qty} onChange={e => updateItem(idx, "qty", e.target.value)}
            placeholder="e.g. 50000" style={inputStyle} />
        </FormField>

        {/* Unit Price */}
        <FormField label="Unit Price (₹)" style={{ gridColumn: "1/-1" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 13 }}>₹</span>
            <input type="number" value={it.unitPrice} onChange={e => updateItem(idx, "unitPrice", e.target.value)}
              placeholder="Price per unit" style={{ ...inputStyle, paddingLeft: 28 }} />
          </div>
          {it.qty && it.unitPrice && (
            <p style={{ color: "#10b981", fontSize: 12, margin: "6px 0 0", fontWeight: 500 }}>
              Line total: <span style={{ fontFamily: "monospace", fontWeight: 700 }}>₹{((parseFloat(it.unitPrice) || 0) * (parseInt(it.qty) || 0)).toLocaleString("en-IN")}</span>
            </p>
          )}
        </FormField>

        {/* Completion indicator */}
        <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "flex-end" }}>
          {itemComplete(it)
            ? <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#10b981", fontSize: 12, fontWeight: 600 }}>
                <Icon name="check" size={14} /> Item complete
              </span>
            : <span style={{ color: "#475569", fontSize: 12 }}>Fill Package, Wattage &amp; Qty to complete</span>
          }
        </div>
      </div>
    );
  };

  // ── REVIEW STEP ──
  if (step === "review") {
    return (
      <Modal title="Review Order Before Saving" onClose={onClose}>
        {/* PO header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 16px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, marginBottom: 20 }}>
          <div>
            <p style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, margin: 0 }}>Customer</p>
            <p style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 16, margin: "2px 0 0" }}>{customer}</p>
            <p style={{ color: "#64748b", fontSize: 12, margin: "2px 0 0" }}>{city}{city && region ? " · " : ""}{region}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            {poNumber && <>
              <p style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, margin: 0 }}>PO Number</p>
              <p style={{ color: "#f59e0b", fontWeight: 700, fontSize: 15, margin: "2px 0 0", fontFamily: "monospace" }}>{poNumber}</p>
            </>}
            <p style={{ color: "#475569", fontSize: 11, margin: "6px 0 0", fontFamily: "monospace" }}>
              📅 PO Date: <span style={{ color: "#94a3b8" }}>{poDate || "—"}</span>
            </p>
            {deliveryDate && (
              <p style={{ color: "#475569", fontSize: 11, margin: "3px 0 0", fontFamily: "monospace" }}>
                🚚 Delivery: <span style={{ color: "#10b981", fontWeight: 600 }}>{deliveryDate}</span>
              </p>
            )}
          </div>
        </div>

        {/* Item summary table */}
        <div style={{ background: "#0d1526", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["#", "Package", "Type", "Wattage", "Voltage", "CCT/Colour", "Lumen", "Qty", "Unit Price", "Amount"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", color: "#475569", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const qty = parseInt(it.qty || 0);
                const up = parseFloat(it.unitPrice || 0);
                const amount = qty * up;
                return (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "10px 12px" }}><span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span></td>
                    <td style={{ padding: "10px 12px" }}><span style={{ background: "rgba(6,182,212,0.1)", color: "#06b6d4", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{packageValue(it) || "—"}</span></td>
                    <td style={{ padding: "10px 12px", color: "#94a3b8", fontSize: 12 }}>{it.productType || "—"}</td>
                    <td style={{ padding: "10px 12px" }}><span style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", padding: "2px 8px", borderRadius: 6, fontSize: 11 }}>{wattageValue(it) || "—"}</span></td>
                    <td style={{ padding: "10px 12px" }}><span style={{ color: "#818cf8", fontSize: 12 }}>{it.voltage || "—"}</span></td>
                    <td style={{ padding: "10px 12px", color: "#10b981", fontSize: 12 }}>{cctValue(it) || "—"}</td>
                    <td style={{ padding: "10px 12px", color: "#64748b", fontSize: 12 }}>{it.lumen || "—"}</td>
                    <td style={{ padding: "10px 12px" }}><span style={{ fontFamily: "monospace", color: "#10b981", fontWeight: 600 }}>{qty.toLocaleString()}</span></td>
                    <td style={{ padding: "10px 12px" }}><span style={{ fontFamily: "monospace", color: "#94a3b8", fontSize: 12 }}>{up ? `₹${up.toLocaleString("en-IN")}` : "—"}</span></td>
                    <td style={{ padding: "10px 12px" }}><span style={{ fontFamily: "monospace", color: "#f59e0b", fontWeight: 600 }}>{amount ? `₹${amount.toLocaleString("en-IN")}` : "—"}</span></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                <td colSpan={7} style={{ padding: "10px 12px" }} />
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Total Qty</div>
                  <div style={{ fontFamily: "monospace", color: "#10b981", fontWeight: 700, fontSize: 13 }}>{items.reduce((s, it) => s + (parseInt(it.qty) || 0), 0).toLocaleString()}</div>
                </td>
                <td style={{ padding: "10px 12px" }} />
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Total Amount</div>
                  <div style={{ fontFamily: "monospace", color: "#f59e0b", fontWeight: 700, fontSize: 15 }}>₹{items.reduce((s, it) => s + (parseInt(it.qty) || 0) * (parseFloat(it.unitPrice) || 0), 0).toLocaleString("en-IN")}</div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => setStep("form")} style={{ padding: "10px 18px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>← Edit</button>
          <button onClick={handleSave} style={{ padding: "10px 24px", background: "linear-gradient(135deg, #f59e0b, #f97316)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✓ Confirm &amp; Save</button>
        </div>
      </Modal>
    );
  }

  // ── FORM STEP ──
  return (
    <Modal title="Log New Order" onClose={onClose}>
      {/* PO Header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 4 }}>
        <FormField label="PO Number">
          <input value={poNumber} onChange={e => setPoNumber(e.target.value)} style={inputStyle} placeholder="e.g. PO-2026-001" />
        </FormField>
        <FormField label="Number of Items" required>
          <select value={numItems} onChange={e => handleNumItems(e.target.value)} style={selectStyle}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} item{n > 1 ? "s" : ""}</option>)}
          </select>
        </FormField>
        <FormField label="Customer Name" required>
          <input value={customer} onChange={e => setCustomer(e.target.value)} style={inputStyle} placeholder="e.g. Bright Electricals" />
        </FormField>
        <FormField label="City">
          <input value={city} onChange={e => setCity(e.target.value)} style={inputStyle} placeholder="e.g. Mumbai" />
        </FormField>
        <FormField label="Region">
          <select value={region} onChange={e => setRegion(e.target.value)} style={selectStyle}>
            {regions.map(r => <option key={r}>{r}</option>)}
          </select>
        </FormField>
        <FormField label="PO Date">
          <input type="date" value={poDate} onChange={e => setPoDate(e.target.value)} style={inputStyle} />
        </FormField>
        <FormField label="Expected Delivery">
          <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} style={inputStyle} />
        </FormField>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "16px 0 0" }} />

      {/* Item Tabs */}
      <div style={{ marginTop: 12 }}>
        {/* Tab bar */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Array.from({ length: numItems }, (_, i) => {
            const done = itemComplete(items[i]);
            return (
              <button key={i} onClick={() => setActiveTab(i)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: `1px solid ${activeTab === i ? "#f59e0b" : done ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)"}`, background: activeTab === i ? "rgba(245,158,11,0.15)" : done ? "rgba(16,185,129,0.07)" : "transparent", color: activeTab === i ? "#f59e0b" : done ? "#10b981" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: activeTab === i ? 700 : 400, transition: "all 0.15s" }}>
                {done && <Icon name="check" size={12} />}
                Item {i + 1}
              </button>
            );
          })}
        </div>

        {/* Active item form */}
        <ItemTab idx={activeTab} />
      </div>

      {/* Footer */}
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#475569", fontSize: 12 }}>
            {items.filter(itemComplete).length} / {numItems} items complete
          </span>
          <div style={{ display: "flex", gap: 3 }}>
            {items.map((it, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: itemComplete(it) ? "#10b981" : "rgba(255,255,255,0.1)" }} />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "10px 18px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={() => setStep("review")} disabled={!allComplete}
            style={{ padding: "10px 20px", background: allComplete ? "linear-gradient(135deg, #f59e0b, #f97316)" : "rgba(255,255,255,0.05)", border: allComplete ? "none" : "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: allComplete ? "#fff" : "#475569", fontWeight: 600, fontSize: 13, cursor: allComplete ? "pointer" : "not-allowed", transition: "all 0.2s" }}>
            Review Order →
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── EDIT ORDER MODAL ─────────────────────────────────────────────────────────

function EditOrderModal({ poItems, onClose, onSave, mixParams }) {
  const first = poItems[0];
  const [poNumber, setPoNumber] = useState(first.poNumber || "");
  const [poDate, setPoDate] = useState(first.poDate || "");
  const [deliveryDate, setDeliveryDate] = useState(first.deliveryDate || "");
  const [customer, setCustomer] = useState(first.customer || "");
  const [city, setCity] = useState(first.city || "");
  const [region, setRegion] = useState(first.region || "North");
  const [activeTab, setActiveTab] = useState(0);
  const [items, setItems] = useState(poItems.map(o => {
    const pkgs = mixParams?.packages || DEFAULT_MIX_PARAMS.packages;
    const inList = pkgs.includes(o.package);
    return {
      id: o.id,
      itemNo: o.itemNo,
      packageMode: inList ? "dropdown" : "custom",
      packageDropdown: inList ? (o.package || "") : "",
      packageCustom: !inList ? (o.package || "") : "",
      productType: o.productType || "",
      wattageMode: (mixParams?.wattages || DEFAULT_MIX_PARAMS.wattages).includes(o.wattage) ? "dropdown" : "custom",
      wattageDropdown: (mixParams?.wattages || DEFAULT_MIX_PARAMS.wattages).includes(o.wattage) ? o.wattage : "",
      wattageCustom: !(mixParams?.wattages || DEFAULT_MIX_PARAMS.wattages).includes(o.wattage) ? o.wattage : "",
      voltage: o.voltage || "",
      cctMode: (mixParams?.colours || DEFAULT_MIX_PARAMS.colours).includes(o.colour) ? "dropdown" : "custom",
      cctDropdown: (mixParams?.colours || DEFAULT_MIX_PARAMS.colours).includes(o.colour) ? o.colour : "",
      cctCustom: !(mixParams?.colours || DEFAULT_MIX_PARAMS.colours).includes(o.colour) ? o.colour : "",
      lumen: o.lumen || "",
      qty: String(o.qty || ""),
      unitPrice: String(o.unitPrice || ""),
    };
  }));

  const regions = ["North", "South", "East", "West", "Central", "Northeast"];
  const packageValue = (it) => it.packageMode === "custom" ? it.packageCustom : it.packageDropdown;
  const wattageValue = (it) => it.wattageMode === "custom" ? it.wattageCustom : it.wattageDropdown;
  const cctValue = (it) => it.cctMode === "custom" ? it.cctCustom : it.cctDropdown;
  const itemComplete = (it) => packageValue(it) && wattageValue(it) && it.qty;

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((it, i) => i !== idx ? it : { ...it, [field]: value }));
  };

  const deleteItem = (idx) => {
    if (items.length === 1) { onClose(); return; }
    setItems(prev => prev.filter((_, i) => i !== idx));
    setActiveTab(prev => Math.min(prev, items.length - 2));
  };

  const handleSave = () => {
    const saved = items.map((it, i) => {
      const qty = parseInt(it.qty) || 0;
      const unitPrice = parseFloat(it.unitPrice) || 0;
      return {
        ...poItems[i] || poItems[0],
        id: it.id,
        poNumber, poDate, deliveryDate, customer, city, region,
        itemNo: i + 1,
        package: packageValue(it),
        productType: it.productType || packageValue(it),
        wattage: wattageValue(it),
        voltage: it.voltage,
        colour: cctValue(it),
        lumen: it.lumen,
        qty, unitPrice,
        value: qty * unitPrice,
      };
    });
    onSave(saved);
  };

  return (
    <Modal title="Edit Order" onClose={onClose}>
      {/* PO Header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 4 }}>
        <FormField label="PO Number">
          <input value={poNumber} onChange={e => setPoNumber(e.target.value)} style={inputStyle} placeholder="e.g. PO-2026-001" />
        </FormField>
        <FormField label="Customer Name" required>
          <input value={customer} onChange={e => setCustomer(e.target.value)} style={inputStyle} />
        </FormField>
        <FormField label="City">
          <input value={city} onChange={e => setCity(e.target.value)} style={inputStyle} />
        </FormField>
        <FormField label="Region">
          <select value={region} onChange={e => setRegion(e.target.value)} style={selectStyle}>
            {regions.map(r => <option key={r}>{r}</option>)}
          </select>
        </FormField>
        <FormField label="PO Date">
          <input type="date" value={poDate} onChange={e => setPoDate(e.target.value)} style={inputStyle} />
        </FormField>
        <FormField label="Expected Delivery">
          <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} style={inputStyle} />
        </FormField>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "16px 0 0" }} />

      {/* Item tabs */}
      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {items.map((it, i) => {
            const done = itemComplete(it);
            return (
              <button key={i} onClick={() => setActiveTab(i)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: `1px solid ${activeTab === i ? "#f59e0b" : done ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)"}`, background: activeTab === i ? "rgba(245,158,11,0.15)" : done ? "rgba(16,185,129,0.07)" : "transparent", color: activeTab === i ? "#f59e0b" : done ? "#10b981" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: activeTab === i ? 700 : 400 }}>
                {done && <Icon name="check" size={12} />}
                Item {i + 1}
              </button>
            );
          })}
        </div>

        {/* Active item fields */}
        {items[activeTab] && (() => {
          const it = items[activeTab];
          const idx = activeTab;
          const packages = mixParams?.packages || DEFAULT_MIX_PARAMS.packages;
          const voltages = mixParams?.voltages || DEFAULT_MIX_PARAMS.voltages;
          const colours = mixParams?.colours || DEFAULT_MIX_PARAMS.colours;
          const wattages = mixParams?.wattages || DEFAULT_MIX_PARAMS.wattages;
          return (
            <div style={{ paddingTop: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FormField label="Package" required style={{ gridColumn: "1/-1" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
                      {["dropdown", "custom"].map(mode => (
                        <button key={mode} onClick={() => updateItem(idx, "packageMode", mode)}
                          style={{ padding: "10px 14px", background: it.packageMode === mode ? "rgba(6,182,212,0.2)" : "transparent", border: "none", color: it.packageMode === mode ? "#06b6d4" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: it.packageMode === mode ? 600 : 400 }}>
                          {mode === "dropdown" ? "Standard" : "Special"}
                        </button>
                      ))}
                    </div>
                    {it.packageMode === "dropdown"
                      ? <select value={it.packageDropdown} onChange={e => updateItem(idx, "packageDropdown", e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                          <option value="">— Select Package —</option>
                          {packages.map(p => <option key={p}>{p}</option>)}
                        </select>
                      : <input value={it.packageCustom} onChange={e => updateItem(idx, "packageCustom", e.target.value)}
                          placeholder="e.g. COB 3030, Custom Module…" style={{ ...inputStyle, flex: 1 }} />
                    }
                  </div>
                </FormField>
                <FormField label="Product Type" style={{ gridColumn: "1/-1" }}>
                  <input value={it.productType} onChange={e => updateItem(idx, "productType", e.target.value)}
                    placeholder="e.g. High Power, RGB, Epistar Chip…" style={inputStyle} />
                </FormField>
                <FormField label="Wattage" required style={{ gridColumn: "1/-1" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
                      {["dropdown", "custom"].map(mode => (
                        <button key={mode} onClick={() => updateItem(idx, "wattageMode", mode)}
                          style={{ padding: "10px 14px", background: it.wattageMode === mode ? "rgba(245,158,11,0.2)" : "transparent", border: "none", color: it.wattageMode === mode ? "#f59e0b" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: it.wattageMode === mode ? 600 : 400 }}>
                          {mode === "dropdown" ? "Standard" : "Special"}
                        </button>
                      ))}
                    </div>
                    {it.wattageMode === "dropdown"
                      ? <select value={it.wattageDropdown} onChange={e => updateItem(idx, "wattageDropdown", e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                          <option value="">— Select —</option>
                          {wattages.map(w => <option key={w}>{w}</option>)}
                        </select>
                      : <input value={it.wattageCustom} onChange={e => updateItem(idx, "wattageCustom", e.target.value)} placeholder="e.g. 3W, 10W…" style={{ ...inputStyle, flex: 1 }} />
                    }
                  </div>
                </FormField>
                <FormField label="Voltage">
                  <select value={it.voltage} onChange={e => updateItem(idx, "voltage", e.target.value)} style={selectStyle}>
                    <option value="">— Select —</option>
                    {voltages.map(v => <option key={v}>{v}</option>)}
                  </select>
                </FormField>
                <FormField label="CCT / Colour">
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
                      {["dropdown", "custom"].map(mode => (
                        <button key={mode} onClick={() => updateItem(idx, "cctMode", mode)}
                          style={{ padding: "10px 14px", background: it.cctMode === mode ? "rgba(16,185,129,0.2)" : "transparent", border: "none", color: it.cctMode === mode ? "#10b981" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: it.cctMode === mode ? 600 : 400 }}>
                          {mode === "dropdown" ? "List" : "Custom"}
                        </button>
                      ))}
                    </div>
                    {it.cctMode === "dropdown"
                      ? <select value={it.cctDropdown} onChange={e => updateItem(idx, "cctDropdown", e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                          <option value="">— Select —</option>
                          {colours.map(c => <option key={c}>{c}</option>)}
                        </select>
                      : <input value={it.cctCustom} onChange={e => updateItem(idx, "cctCustom", e.target.value)} placeholder="e.g. 3000K…" style={{ ...inputStyle, flex: 1 }} />
                    }
                  </div>
                </FormField>
                <FormField label="Lumen Output">
                  <input value={it.lumen} onChange={e => updateItem(idx, "lumen", e.target.value)} placeholder="e.g. 120 lm" style={inputStyle} />
                </FormField>
                <FormField label="Order Quantity" required>
                  <input type="number" value={it.qty} onChange={e => updateItem(idx, "qty", e.target.value)} placeholder="e.g. 50000" style={inputStyle} />
                </FormField>
                <FormField label="Unit Price (₹)" style={{ gridColumn: "1/-1" }}>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 13 }}>₹</span>
                    <input type="number" value={it.unitPrice} onChange={e => updateItem(idx, "unitPrice", e.target.value)} placeholder="Price per unit" style={{ ...inputStyle, paddingLeft: 28 }} />
                  </div>
                  {it.qty && it.unitPrice && (
                    <p style={{ color: "#10b981", fontSize: 12, margin: "6px 0 0", fontWeight: 500 }}>
                      Line total: <span style={{ fontFamily: "monospace", fontWeight: 700 }}>₹{((parseFloat(it.unitPrice) || 0) * (parseInt(it.qty) || 0)).toLocaleString("en-IN")}</span>
                    </p>
                  )}
                </FormField>
              </div>
              {items.length > 1 && (
                <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => deleteItem(idx)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
                    🗑 Delete Item {idx + 1}
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onClose} style={{ padding: "10px 18px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>Cancel</button>
        <button onClick={handleSave} disabled={!items.every(itemComplete)}
          style={{ padding: "10px 20px", background: items.every(itemComplete) ? "linear-gradient(135deg, #f59e0b, #f97316)" : "rgba(255,255,255,0.05)", border: "none", borderRadius: 10, color: items.every(itemComplete) ? "#fff" : "#475569", fontWeight: 600, fontSize: 13, cursor: items.every(itemComplete) ? "pointer" : "not-allowed" }}>
          Save Changes
        </button>
      </div>
    </Modal>
  );
}

// ─── ORDERS ───────────────────────────────────────────────────────────────────

function Orders({ orders, addOrders, updateOrders, deleteOrders, currentUser, mixParams, users }) {
  const isManager = ["admin","biz_head"].includes(currentUser.role);
  const myOrders = isManager ? orders : orders.filter(o => o.userId === currentUser.id);
  const [showForm, setShowForm] = useState(false);
  const [editingPO, setEditingPO] = useState(null); // array of items for the PO being edited
  const [confirmDeleteKey, setConfirmDeleteKey] = useState(null);
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");

  const filtered = myOrders.filter(o =>
    (filterMonth === "all" || o.month === parseInt(filterMonth)) &&
    (filterProduct === "all" || o.productType === filterProduct)
  );

  const handleSaveOrder = (newItems) => {
    const withUser = newItems.map(it => ({ ...it, userId: currentUser.id }));
    addOrders(withUser);
    setShowForm(false);
  };

  const handleEditSave = (updatedItems) => {
    updateOrders(updatedItems);
    setEditingPO(null);
  };

  const handleDeletePO = (poItems) => {
    const ids = poItems.map(o => o.id);
    deleteOrders(ids);
    setConfirmDeleteKey(null);
  };

  // Group orders by PO for display
  const poGroups = {};
  filtered.sort((a, b) => b.date.localeCompare(a.date)).forEach(o => {
    const key = o.poNumber ? `PO:${o.poNumber}:${o.date}:${o.customer}` : `SINGLE:${o.id}`;
    if (!poGroups[key]) poGroups[key] = [];
    poGroups[key].push(o);
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#f1f5f9", fontSize: 24, fontWeight: 700, margin: 0 }}>Orders</h1>
          <p style={{ color: "#475569", fontSize: 13, margin: "4px 0 0" }}>
            {filtered.length} line items · {Object.keys(poGroups).length} POs
            {!isManager ? " · your entries" : ""}
          </p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "linear-gradient(135deg, #f59e0b, #f97316)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          <Icon name="add" size={16} /> New Order
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ ...selectStyle, width: 160 }}>
          <option value="all">All Months</option>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} style={{ ...selectStyle, width: 200 }}>
          <option value="all">All Packages</option>
          {(mixParams?.packages || DEFAULT_MIX_PARAMS.packages).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* PO-grouped order list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Object.keys(poGroups).length === 0 ? (
          <div style={{ background: "#131f35", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 40, textAlign: "center", color: "#475569", fontSize: 13 }}>No orders found</div>
        ) : Object.entries(poGroups).map(([key, items]) => {
          const first = items[0];
          const sp = users.find(u => u.id === first.userId);
          const totalQty = items.reduce((s, o) => s + o.qty, 0);
          const totalValue = items.reduce((s, o) => s + (o.value || 0), 0);
          const isConfirming = confirmDeleteKey === key;
          return (
            <div key={key} style={{ background: "#131f35", border: `1px solid ${isConfirming ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 16, overflow: "hidden", transition: "border-color 0.2s" }}>
              {/* PO header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {first.poNumber && (
                    <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "3px 10px", borderRadius: 6 }}>{first.poNumber}</span>
                  )}
                  <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14 }}>{first.customer}</span>
                  {first.city && <span style={{ color: "#475569", fontSize: 12 }}>{first.city}</span>}
                  {isManager && sp && <span style={{ color: "#64748b", fontSize: 11, background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 6 }}>👤 {sp.name.split(" ")[0]}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#475569", fontSize: 11, fontFamily: "monospace" }}>{first.poDate || first.date}</span>
                  {first.deliveryDate && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#10b981", fontSize: 11, fontFamily: "monospace" }}>
                      🚚 {first.deliveryDate}
                    </span>
                  )}
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>{items.length} item{items.length > 1 ? "s" : ""}</span>
                  <span style={{ fontFamily: "monospace", color: "#10b981", fontWeight: 700, fontSize: 13 }}>{totalQty.toLocaleString()} units</span>
                  {totalValue > 0 && <span style={{ fontFamily: "monospace", color: "#f59e0b", fontWeight: 700, fontSize: 13 }}>₹{totalValue.toLocaleString("en-IN")}</span>}
                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 6, marginLeft: 6 }}>
                    {isConfirming ? (
                      <>
                        <span style={{ color: "#ef4444", fontSize: 12, alignSelf: "center", fontWeight: 500 }}>Delete PO?</span>
                        <button onClick={() => handleDeletePO(items)}
                          style={{ padding: "5px 12px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 7, color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Yes</button>
                        <button onClick={() => setConfirmDeleteKey(null)}
                          style={{ padding: "5px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "#94a3b8", cursor: "pointer", fontSize: 12 }}>No</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditingPO(items)}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 7, color: "#818cf8", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
                          ✎ Edit
                        </button>
                        <button onClick={() => setConfirmDeleteKey(key)}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 7, color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
                          🗑
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {/* Line items table */}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    {["#", "Package", "Product Type", "Wattage", "Voltage", "CCT/Colour", "Lumen", "Qty", "Unit Price", "Amount"].map(h => (
                      <th key={h} style={{ padding: "8px 14px", color: "#334155", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((o, idx) => (
                    <tr key={o.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={tdStyle}><span style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(245,158,11,0.12)", color: "#f59e0b", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{o.itemNo || idx + 1}</span></td>
                      <td style={tdStyle}><span style={{ background: "rgba(6,182,212,0.1)", color: "#06b6d4", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{o.package || "—"}</span></td>
                      <td style={tdStyle}><span style={{ color: "#64748b", fontSize: 12 }}>{o.productType || "—"}</span></td>
                      <td style={tdStyle}><span style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", padding: "2px 8px", borderRadius: 6, fontSize: 11 }}>{o.wattage || "—"}</span></td>
                      <td style={tdStyle}><span style={{ color: "#818cf8", fontSize: 12 }}>{o.voltage || "—"}</span></td>
                      <td style={tdStyle}><span style={{ color: "#10b981", fontSize: 12 }}>{o.colour || "—"}</span></td>
                      <td style={tdStyle}><span style={{ color: "#64748b", fontSize: 12 }}>{o.lumen || "—"}</span></td>
                      <td style={tdStyle}><span style={{ fontFamily: "monospace", color: "#10b981", fontWeight: 600 }}>{o.qty.toLocaleString()}</span></td>
                      <td style={tdStyle}><span style={{ fontFamily: "monospace", color: "#94a3b8", fontSize: 12 }}>{o.unitPrice ? `₹${Number(o.unitPrice).toLocaleString("en-IN")}` : "—"}</span></td>
                      <td style={tdStyle}><span style={{ fontFamily: "monospace", color: "#f59e0b", fontWeight: 600 }}>{o.value ? `₹${Number(o.value).toLocaleString("en-IN")}` : "—"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {showForm && <NewOrderModal onClose={() => setShowForm(false)} onSave={handleSaveOrder} mixParams={mixParams} />}
      {editingPO && <EditOrderModal poItems={editingPO} onClose={() => setEditingPO(null)} onSave={handleEditSave} mixParams={mixParams} />}
    </div>
  );
}

// ─── VISITS ───────────────────────────────────────────────────────────────────

function Visits({ visits, addVisit, orders, currentUser, users }) {
  const isManager = ["admin","biz_head"].includes(currentUser.role);
  const myVisits = isManager ? visits : visits.filter(v => v.userId === currentUser.id);
  const [showForm, setShowForm] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [photos, setPhotos] = useState([]);
  const fileRef = useRef();
  const [form, setForm] = useState({ customer: "", city: "", lat: "", lng: "", notes: "", orderId: "" });

  const captureLocation = () => {
    setLocating(true);
    setLocError("");
    if (!navigator.geolocation) {
      setLocError("GPS not supported on this device.");
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f => ({ ...f, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }));
        setLocating(false);
      },
      () => {
        setLocError("Location access denied. Please enable GPS permission for this app.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePhoto = (e) => {
    Array.from(e.target.files).forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setPhotos(p => [...p, { name: f.name, data: ev.target.result }]);
      reader.readAsDataURL(f);
    });
  };

  const resetForm = () => {
    setForm({ customer: "", city: "", lat: "", lng: "", notes: "", orderId: "" });
    setPhotos([]);
    setLocError("");
  };

  const saveVisit = () => {
    if (!form.customer || !form.lat) return;
    const now = new Date();
    const visit = { ...form, id: `v${Date.now()}`, userId: currentUser.id, date: now.toISOString().split("T")[0], photos: photos.map(p => p.data) };
    addVisit(visit);
    setShowForm(false);
    resetForm();
  };

  const myOrders = orders.filter(o => o.userId === currentUser.id);
  const locationCaptured = form.lat && form.lng;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#f1f5f9", fontSize: 24, fontWeight: 700, margin: 0 }}>Visit Log</h1>
          <p style={{ color: "#475569", fontSize: 13, margin: "4px 0 0" }}>{myVisits.length} visits recorded</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "linear-gradient(135deg, #10b981, #059669)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          <Icon name="location" size={16} /> Log Visit
        </button>
      </div>

      {/* Visit cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {myVisits.length === 0 ? (
          <p style={{ color: "#475569", gridColumn: "1/-1", textAlign: "center", padding: 40 }}>No visits logged yet.</p>
        ) : myVisits.sort((a, b) => b.date.localeCompare(a.date)).map(v => {
          const sp = users.find(u => u.id === v.userId);
          const linkedOrder = orders.find(o => o.id === v.orderId);
          return (
            <div key={v.id} style={{ background: "#131f35", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <p style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 15, margin: 0 }}>{v.customer}</p>
                  <p style={{ color: "#475569", fontSize: 12, margin: "2px 0 0" }}>{v.city}</p>
                </div>
                <span style={{ fontFamily: "monospace", fontSize: 10, color: "#64748b", background: "rgba(255,255,255,0.05)", padding: "3px 8px", borderRadius: 6 }}>{v.date}</span>
              </div>
              {isManager && <p style={{ color: "#f59e0b", fontSize: 11, margin: "0 0 8px", fontWeight: 600 }}>👤 {sp?.name}</p>}
              {v.lat && v.lng
                ? <a href={`https://maps.google.com/?q=${v.lat},${v.lng}`} target="_blank" rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#3b82f6", fontSize: 11, textDecoration: "none", marginBottom: 8, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", padding: "4px 10px", borderRadius: 20 }}>
                    <Icon name="location" size={12} /> {v.lat}, {v.lng} ↗
                  </a>
                : <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#475569", fontSize: 11, marginBottom: 8 }}>📍 No GPS recorded</span>
              }
              {v.notes && <p style={{ color: "#94a3b8", fontSize: 12, margin: "4px 0 8px", fontStyle: "italic" }}>"{v.notes}"</p>}
              {linkedOrder && (
                <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, padding: "6px 10px", marginTop: 8 }}>
                  <p style={{ color: "#f59e0b", fontSize: 11, margin: 0 }}>🛒 {linkedOrder.package || linkedOrder.productType} · {fmtQty(linkedOrder.qty)} units</p>
                </div>
              )}
              {v.photos?.length > 0 && (
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  {v.photos.map((p, i) => <img key={i} src={p} alt="visit" style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)" }} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Log visit modal */}
      {showForm && (
        <Modal title="Log Customer Visit" onClose={() => { setShowForm(false); resetForm(); }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Customer Name" required>
              <input value={form.customer} onChange={e => setForm({...form, customer: e.target.value})} style={inputStyle} placeholder="e.g. Bright Electricals" />
            </FormField>
            <FormField label="City">
              <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} style={inputStyle} placeholder="e.g. Mumbai" />
            </FormField>

            {/* GPS — auto capture only */}
            <FormField label="GPS Location" required style={{ gridColumn: "1/-1" }}>
              {locationCaptured ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>📍</span>
                    <div>
                      <p style={{ color: "#10b981", fontSize: 12, fontWeight: 600, margin: 0 }}>Location captured</p>
                      <p style={{ color: "#475569", fontSize: 11, margin: "2px 0 0", fontFamily: "monospace" }}>{form.lat}, {form.lng}</p>
                    </div>
                  </div>
                  <button onClick={captureLocation} style={{ padding: "5px 12px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, color: "#10b981", cursor: "pointer", fontSize: 11 }}>
                    Recapture
                  </button>
                </div>
              ) : (
                <div>
                  <button onClick={captureLocation} disabled={locating}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", background: locating ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.12)", border: `1px solid ${locating ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.35)"}`, borderRadius: 10, color: locating ? "#475569" : "#3b82f6", cursor: locating ? "default" : "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s" }}>
                    <Icon name="location" size={16} />
                    {locating ? "Capturing location…" : "📍 Capture My Location"}
                  </button>
                  {locError && <p style={{ color: "#ef4444", fontSize: 12, margin: "8px 0 0" }}>{locError}</p>}
                  {!locError && <p style={{ color: "#475569", fontSize: 11, margin: "8px 0 0", textAlign: "center" }}>GPS must be enabled on your device. Location is captured automatically — it cannot be entered manually.</p>}
                </div>
              )}
            </FormField>

            <FormField label="Link to Order (optional)" style={{ gridColumn: "1/-1" }}>
              <select value={form.orderId} onChange={e => setForm({...form, orderId: e.target.value})} style={selectStyle}>
                <option value="">— No linked order —</option>
                {myOrders.map(o => <option key={o.id} value={o.id}>{o.customer} · {o.package || o.productType} · {o.date}</option>)}
              </select>
            </FormField>
            <FormField label="Visit Notes" style={{ gridColumn: "1/-1" }}>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} style={{...inputStyle, height: 72, resize: "vertical"}} placeholder="What was discussed? Any follow-up needed?" />
            </FormField>
            <FormField label="Photos" style={{ gridColumn: "1/-1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => fileRef.current.click()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#94a3b8", cursor: "pointer", fontSize: 12 }}>
                  <Icon name="camera" size={14} /> Add Photos
                </button>
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhoto} style={{ display: "none" }} />
                {photos.map((p, i) => <img key={i} src={p.data} alt={p.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} />)}
              </div>
            </FormField>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button onClick={() => { setShowForm(false); resetForm(); }} style={{ padding: "10px 20px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>Cancel</button>
            <button onClick={saveVisit} disabled={!form.customer || !locationCaptured}
              style={{ padding: "10px 20px", background: form.customer && locationCaptured ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(255,255,255,0.05)", border: "none", borderRadius: 10, color: form.customer && locationCaptured ? "#fff" : "#475569", fontWeight: 600, fontSize: 13, cursor: form.customer && locationCaptured ? "pointer" : "not-allowed" }}>
              Save Visit
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── TARGETS ──────────────────────────────────────────────────────────────────

function Targets({ orders, targets, setTargets, saveTarget, currentUser, users, setUsers }) {
  const now = new Date();
  const isAdmin = currentUser.role === "admin";
  const isBizHead = currentUser.role === "biz_head";
  const canEdit = isAdmin || isBizHead;

  const salespeople = users.filter(u => u.role === "salesperson");
  const bizHead = users.find(u => u.role === "biz_head");

  const [editingId, setEditingId] = useState(null);
  const [draftVal, setDraftVal] = useState("");
  const [showNameEditor, setShowNameEditor] = useState(false);
  const [nameDrafts, setNameDrafts] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [newSpName, setNewSpName] = useState("");

  const openNameEditor = () => {
    const drafts = {};
    users.filter(u => u.role !== "admin").forEach(u => { drafts[u.id] = u.name; });
    setNameDrafts(drafts);
    setNewSpName("");
    setShowNameEditor(true);
  };

  const saveNames = () => {
    setUsers(prev => prev.map(u => nameDrafts[u.id] !== undefined ? { ...u, name: nameDrafts[u.id].trim() || u.name } : u));
    setShowNameEditor(false);
    setConfirmDeleteId(null);
  };

  const addSalesperson = () => {
    const name = newSpName.trim();
    if (!name) return;
    const existingIds = users.filter(u => u.role === "salesperson").map(u => u.id);
    let newId = "sp1";
    for (let i = 1; i <= 4; i++) {
      if (!existingIds.includes(`sp${i}`)) { newId = `sp${i}`; break; }
    }
    setUsers(prev => [...prev, { id: newId, name, role: "salesperson", title: "Sales Exec", password: "ijh@1234" }]);
    setNewSpName("");
  };

  const openEdit = (id) => {
    setEditingId(id);
    setDraftVal(String(targets[id]?.monthly || ""));
  };
  const saveEdit = (id) => {
    const val = parseFloat(draftVal);
    if (!isNaN(val) && val >= 0) saveTarget(id, val);
    setEditingId(null);
  };

  // For a given userId: sum of their own orders this month
  const getAchieved = (userId) =>
    orders.filter(o => o.userId === userId && o.month === now.getMonth() && o.year === now.getFullYear())
      .reduce((s, o) => s + o.value, 0);

  // Team total (all salespeople)
  const teamAchieved = salespeople.reduce((s, sp) => s + getAchieved(sp.id), 0);
  const teamTarget = salespeople.reduce((s, sp) => s + (targets[sp.id]?.monthly || 0), 0);

  // BH total = own + team
  const bhPersonalAchieved = bizHead ? getAchieved(bizHead.id) : 0;
  const bhPersonalTarget = bizHead ? (targets[bizHead.id]?.monthly || 0) : 0;
  const bhTotalAchieved = bhPersonalAchieved + teamAchieved;
  const bhTotalTarget = bhPersonalTarget + teamTarget;

  const TargetCard = ({ user, achieved, target, canEditThis, showTeamRollup = false }) => {
    const pct = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;
    const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
    const isEditing = editingId === user.id;
    const spOrders = orders.filter(o => o.userId === user.id && o.month === now.getMonth() && o.year === now.getFullYear());

    return (
      <div style={{ background: "#131f35", border: `1px solid ${isEditing ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)"}`, borderRadius: 16, padding: 24, transition: "border-color 0.2s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${color}55, ${color}22)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color }}>
              {user.name[0]}
            </div>
            <div>
              <p style={{ color: "#e2e8f0", fontWeight: 600, margin: 0 }}>{user.name}</p>
              <p style={{ color: "#475569", fontSize: 11, margin: 0 }}>{user.title} · {spOrders.length} orders this month</p>
            </div>
          </div>
          <span style={{ color, fontFamily: "monospace", fontSize: 22, fontWeight: 700 }}>{pct}%</span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, marginBottom: 16 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <p style={{ color: "#475569", fontSize: 10, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: 0.6 }}>Achieved</p>
            <p style={{ color, fontFamily: "monospace", fontSize: 16, fontWeight: 700, margin: 0 }}>{fmt(achieved)}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "#475569", fontSize: 10, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.6 }}>Monthly Target</p>
            {isEditing ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 12 }}>₹</span>
                  <input type="number" value={draftVal} onChange={e => setDraftVal(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveEdit(user.id); if (e.key === "Escape") setEditingId(null); }}
                    autoFocus style={{ ...inputStyle, width: 130, paddingLeft: 22, textAlign: "right", fontFamily: "monospace", fontSize: 14, fontWeight: 700 }} />
                </div>
                <button onClick={() => saveEdit(user.id)} style={{ padding: "8px 12px", background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 8, color: "#818cf8", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>✓</button>
                <button onClick={() => setEditingId(null)} style={{ padding: "8px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#475569", cursor: "pointer", fontSize: 13 }}>✕</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <p style={{ color: "#64748b", fontFamily: "monospace", fontSize: 16, fontWeight: 700, margin: 0 }}>
                  {target > 0 ? fmt(target) : <span style={{ color: "#334155", fontSize: 13, fontStyle: "italic" }}>Not set</span>}
                </p>
                {canEditThis && (
                  <button onClick={() => openEdit(user.id)} style={{ padding: "4px 10px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 7, color: "#818cf8", cursor: "pointer", fontSize: 11, fontWeight: 500 }}>✎ Edit</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ color: "#f1f5f9", fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Target vs Achievement</h1>
            <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>{MONTHS[now.getMonth()]} {now.getFullYear()}</p>
          </div>
          {isAdmin && (
            <button onClick={openNameEditor}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)", borderRadius: 10, color: "#06b6d4", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
              ✎ Manage Team
            </button>
          )}
        </div>
      </div>

      {/* Name editor modal */}
      {showNameEditor && (
        <Modal title="Manage Team" onClose={() => { setShowNameEditor(false); setConfirmDeleteId(null); }}>
          <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 20px" }}>Edit names or remove salespeople. CEO name is fixed.</p>

          {/* Business Head */}
          {bizHead && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ height: 1, flex: 1, background: "rgba(99,102,241,0.2)" }} />
                <span style={{ color: "#818cf8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>Business Head</span>
                <div style={{ height: 1, flex: 1, background: "rgba(99,102,241,0.2)" }} />
              </div>
              <FormField label="Name">
                <input value={nameDrafts[bizHead.id] ?? bizHead.name}
                  onChange={e => setNameDrafts(d => ({ ...d, [bizHead.id]: e.target.value }))}
                  style={inputStyle} placeholder="Full name" />
              </FormField>
            </div>
          )}

          {/* Sales Team */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ height: 1, flex: 1, background: "rgba(16,185,129,0.2)" }} />
              <span style={{ color: "#10b981", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>Sales Team</span>
              <span style={{ color: "#334155", fontSize: 10 }}>{salespeople.length}/4</span>
              <div style={{ height: 1, flex: 1, background: "rgba(16,185,129,0.2)" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {salespeople.map(sp => (
                <div key={sp.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: confirmDeleteId === sp.id ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${confirmDeleteId === sp.id ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.06)"}`, borderRadius: 10, transition: "all 0.2s" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{(nameDrafts[sp.id] ?? sp.name)[0]}</div>
                  <input
                    value={nameDrafts[sp.id] ?? sp.name}
                    onChange={e => setNameDrafts(d => ({ ...d, [sp.id]: e.target.value }))}
                    style={{ ...inputStyle, flex: 1, margin: 0, padding: "7px 10px", fontSize: 13 }}
                    placeholder="Full name"
                  />
                  {confirmDeleteId === sp.id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <span style={{ color: "#ef4444", fontSize: 11, whiteSpace: "nowrap" }}>Remove?</span>
                      <button onClick={() => { setUsers(prev => prev.filter(u => u.id !== sp.id)); setConfirmDeleteId(null); }} style={{ padding: "5px 10px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 7, color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Yes</button>
                      <button onClick={() => setConfirmDeleteId(null)} style={{ padding: "5px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "#94a3b8", cursor: "pointer", fontSize: 12 }}>No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(sp.id)}
                      style={{ padding: "5px 10px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 7, color: "#ef4444", cursor: "pointer", fontSize: 12, flexShrink: 0 }}>
                      🗑
                    </button>
                  )}
                </div>
              ))}

              {/* Add new salesperson — only if under limit */}
              {salespeople.length < 4 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(16,185,129,0.04)", border: "1px dashed rgba(16,185,129,0.25)", borderRadius: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981", fontSize: 16, flexShrink: 0 }}>+</div>
                  <input
                    value={newSpName}
                    onChange={e => setNewSpName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addSalesperson()}
                    style={{ ...inputStyle, flex: 1, margin: 0, padding: "7px 10px", fontSize: 13 }}
                    placeholder="New salesperson name…"
                  />
                  <button onClick={addSalesperson} disabled={!newSpName.trim()}
                    style={{ padding: "5px 12px", background: newSpName.trim() ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${newSpName.trim() ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 7, color: newSpName.trim() ? "#10b981" : "#334155", cursor: newSpName.trim() ? "pointer" : "not-allowed", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                    Add
                  </button>
                </div>
              )}
              {salespeople.length >= 4 && (
                <p style={{ color: "#475569", fontSize: 11, textAlign: "center", margin: "4px 0 0", fontStyle: "italic" }}>Maximum of 4 sales personnel reached.</p>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
            <button onClick={() => { setShowNameEditor(false); setConfirmDeleteId(null); }} style={{ padding: "10px 18px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>Cancel</button>
            <button onClick={saveNames} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #06b6d4, #0891b2)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Save Names</button>
          </div>
        </Modal>
      )}

      {/* ── Business Head section ── */}
      {bizHead && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ height: 1, flex: 1, background: "rgba(99,102,241,0.2)" }} />
            <span style={{ color: "#818cf8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Business Head</span>
            <div style={{ height: 1, flex: 1, background: "rgba(99,102,241,0.2)" }} />
          </div>

          {/* BH consolidated card */}
          <div style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 16, padding: 24, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <p style={{ color: "#818cf8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 2px" }}>Consolidated Target (Own + Team)</p>
                <p style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 16, margin: 0 }}>{bizHead.name}</p>
              </div>
              {bhTotalTarget > 0 && (
                <span style={{ color: bhTotalTarget > 0 ? (bhTotalAchieved / bhTotalTarget >= 0.8 ? "#10b981" : bhTotalAchieved / bhTotalTarget >= 0.5 ? "#f59e0b" : "#ef4444") : "#475569", fontFamily: "monospace", fontSize: 22, fontWeight: 700 }}>
                  {bhTotalTarget > 0 ? Math.min(100, Math.round((bhTotalAchieved / bhTotalTarget) * 100)) : 0}%
                </span>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 16 }}>
              {[
                { label: "Personal Achieved", value: fmt(bhPersonalAchieved), color: "#06b6d4" },
                { label: "Team Achieved", value: fmt(teamAchieved), color: "#10b981" },
                { label: "Total Achieved", value: fmt(bhTotalAchieved), color: "#f59e0b" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 14px" }}>
                  <p style={{ color: "#475569", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 4px" }}>{label}</p>
                  <p style={{ color, fontFamily: "monospace", fontWeight: 700, fontSize: 15, margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
            {bhTotalTarget > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                  <div style={{ height: "100%", width: `${Math.min(100, Math.round((bhTotalAchieved / bhTotalTarget) * 100))}%`, background: "linear-gradient(90deg, #6366f1, #8b5cf6)", borderRadius: 3, transition: "width 0.6s ease" }} />
                </div>
                <p style={{ color: "#475569", fontSize: 11, margin: "6px 0 0", textAlign: "right" }}>
                  Total target: <span style={{ color: "#64748b", fontFamily: "monospace", fontWeight: 600 }}>{fmt(bhTotalTarget)}</span>
                  <span style={{ color: "#334155", margin: "0 6px" }}>·</span>
                  Personal: <span style={{ color: "#64748b", fontFamily: "monospace" }}>{fmt(bhPersonalTarget)}</span>
                  <span style={{ color: "#334155", margin: "0 6px" }}>·</span>
                  Team: <span style={{ color: "#64748b", fontFamily: "monospace" }}>{fmt(teamTarget)}</span>
                </p>
              </div>
            )}
          </div>

          {/* BH individual card */}
          <TargetCard
            user={bizHead}
            achieved={bhPersonalAchieved}
            target={bhPersonalTarget}
            canEditThis={isAdmin}
          />
        </div>
      )}

      {/* ── Sales Team section ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ height: 1, flex: 1, background: "rgba(16,185,129,0.2)" }} />
          <span style={{ color: "#10b981", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Sales Team</span>
          <div style={{ height: 1, flex: 1, background: "rgba(16,185,129,0.2)" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {salespeople.map(sp => (
            <TargetCard
              key={sp.id}
              user={sp}
              achieved={getAchieved(sp.id)}
              target={targets[sp.id]?.monthly || 0}
              canEditThis={canEdit}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div style={{ background: "#131f35", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 28, width: "min(90vw, 580px)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h2 style={{ color: "#f1f5f9", fontSize: 17, fontWeight: 700, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}><Icon name="close" size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, required, children, style }) {
  return (
    <div style={style}>
      <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 6 }}>{label}{required && <span style={{ color: "#ef4444" }}> *</span>}</label>
      {children}
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const inputStyle = {
  width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif",
};
const selectStyle = {
  width: "100%", padding: "10px 12px", background: "#0d1526", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif",
};
const tdStyle = { padding: "10px 16px", fontSize: 13, verticalAlign: "middle" };
