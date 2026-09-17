'use client';

import React, { useState, useEffect } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'landing' | 'app'>('landing');
  const [user, setUser] = useState<any>(null);
  const [authForm, setAuthForm] = useState({ email: 'admin@pharmacy.com', password: 'admin123', name: '', isRegister: false });

  // Inventory & Search States
  const [medicines, setMedicines] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Alerts & Modals
  const [alerts, setAlerts] = useState<{ expiringSoon: any[]; expired: any[] }>({ expiringSoon: [], expired: [] });
  const [dispenseTarget, setDispenseTarget] = useState<any>(null);
  const [dispenseQty, setDispenseQty] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Add Medicine Form
  const [newMedName, setNewMedName] = useState('');
  const [newMedCategory, setNewMedCategory] = useState('');

  // Add Batch Form
  const [batchMedId, setBatchMedId] = useState('');
  const [batchNum, setBatchNum] = useState('');
  const [batchQty, setBatchQty] = useState('');
  const [batchExp, setBatchExp] = useState('');

  // Fetch Inventory
  const fetchMedicines = async () => {
    try {
      const res = await fetch(`/api/medicines?search=${encodeURIComponent(search)}&sort=${sort}&order=${order}&page=${page}&limit=5`);
      const data = await res.json();
      setMedicines(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Alerts
  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      setAlerts(data || { expiringSoon: [], expired: [] });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'app' && user) {
      fetchMedicines();
      fetchAlerts();
    }
  }, [activeTab, user, search, sort, order, page]);

  // Auth Submit
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: authForm.isRegister ? 'register' : 'login',
          email: authForm.email,
          password: authForm.password,
          name: authForm.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setActiveTab('app');
      } else {
        alert(data.error || 'Authentication failed');
      }
    } catch (err: any) {
      alert('Error signing in: ' + err.message);
    }
  };

  // Dispense Action (FEFO)
  const handleDispense = async () => {
    if (!dispenseTarget || !dispenseQty) return;
    try {
      const res = await fetch('/api/dispense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicineId: dispenseTarget.id, quantity: dispenseQty }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(`Dispensed successfully. Batches used: ${data.batchesDeducted.map((b: any) => `${b.batchNumber} (-${b.deducted})`).join(', ')}`);
        setDispenseTarget(null);
        setDispenseQty('');
        fetchMedicines();
        fetchAlerts();
      } else {
        alert(data.error || 'Dispense failed');
      }
    } catch (err: any) {
      alert('Dispense error: ' + err.message);
    }
  };

  // Add Medicine
  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/medicines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newMedName, category: newMedCategory }),
    });
    setNewMedName('');
    setNewMedCategory('');
    fetchMedicines();
  };

  // Add Batch
  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medicineId: batchMedId,
        batchNumber: batchNum,
        quantity: batchQty,
        expiryDate: batchExp,
      }),
    });
    setBatchNum('');
    setBatchQty('');
    setBatchExp('');
    fetchMedicines();
    fetchAlerts();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-black text-xl">
            Rx
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">PharmaFEFO</h1>
            <p className="text-xs text-slate-500 font-medium">Oldest-First Smart Dispensing System</p>
          </div>
        </div>

        <nav className="flex items-center space-x-4">
          <button
            onClick={() => setActiveTab('landing')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              activeTab === 'landing' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Landing Page
          </button>
          <button
            onClick={() => setActiveTab('app')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              activeTab === 'app' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inventory App
          </button>
          {user && (
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
              {user.name} ({user.email})
            </span>
          )}
        </nav>
      </header>

      {activeTab === 'landing' && (
        <main className="max-w-5xl mx-auto px-6 py-12">
          <div className="text-center space-y-4 mb-16">
            <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
              FEFO Inventory Protection
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
              Dispense Confidently. Zero Expired Stock Out the Door.
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Automated First-Expiry-First-Out dispensing logic built for high-throughput neighbourhood pharmacies.
            </p>
            <div>
              <button
                onClick={() => setActiveTab('app')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-3 rounded-lg shadow-sm transition"
              >
                Launch Pharmacist Console
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Automated FEFO Protocol</h3>
              <p className="text-sm text-slate-600">
                Prioritizes batches closest to expiration. Exhausts older in-date stock before touching newer inventory.
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Real-Time In-Date Radar</h3>
              <p className="text-sm text-slate-600">
                Immediately isolates expired units out of your active stock counts so you never sell unviable medication.
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-2">30-Day Expiry Early Warning</h3>
              <p className="text-sm text-slate-600">
                Flags batches reaching end-of-life within 30 days so pharmacists can return or discount them safely.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-8 mb-12">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-emerald-400 font-semibold uppercase text-xs tracking-wider mb-2">Target Audience</h4>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Designed for community pharmacies, hospital outpatient dispensaries, and independent chemists managing multi-batch generic formulations with varying shelf lives.
                </p>
              </div>
              <div>
                <h4 className="text-emerald-400 font-semibold uppercase text-xs tracking-wider mb-2">Next 3 Features</h4>
                <ul className="text-slate-300 text-sm space-y-1 list-disc list-inside">
                  <li>2D Barcode Scanner integration for rapid batch intake.</li>
                  <li>Automated vendor return credit notes for batches under 15 days shelf life.</li>
                  <li>Multi-branch automated stock rebalancing and inter-store transfers.</li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      )}

      {activeTab === 'app' && (
        <main className="max-w-6xl mx-auto px-6 py-8">
          {!user ? (
            <div className="max-w-md mx-auto bg-white p-8 rounded-xl border border-slate-200 shadow-sm mt-10">
              <h2 className="text-xl font-bold mb-4 text-center">
                {authForm.isRegister ? 'Pharmacist Sign Up' : 'Pharmacist Login'}
              </h2>
              <form onSubmit={handleAuth} className="space-y-4">
                {authForm.isRegister && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      value={authForm.name}
                      onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                      placeholder="Jane Doe"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg text-sm transition"
                >
                  {authForm.isRegister ? 'Create Account' : 'Sign In'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <button
                  onClick={() => setAuthForm({ ...authForm, isRegister: !authForm.isRegister })}
                  className="text-xs text-emerald-600 hover:underline"
                >
                  {authForm.isRegister ? 'Already have an account? Log in' : 'Need an account? Register'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {statusMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm flex justify-between">
                  <span>{statusMessage}</span>
                  <button onClick={() => setStatusMessage('')} className="font-bold">✕</button>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
                    Batches Expiring in Next 30 Days ({alerts.expiringSoon?.length || 0})
                  </h3>
                  <div className="max-h-24 overflow-y-auto space-y-1 text-xs text-amber-900">
                    {alerts.expiringSoon?.length === 0 ? (
                      <p>No batches expiring soon.</p>
                    ) : (
                      alerts.expiringSoon?.map((b) => (
                        <div key={b.id} className="flex justify-between">
                          <span>{b.medicine?.name} ({b.batchNumber})</span>
                          <span className="font-semibold">Expires: {new Date(b.expiryDate).toLocaleDateString()} ({b.quantity} left)</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                  <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-2">
                    Expired Batches (Excluded From Stock) ({alerts.expired?.length || 0})
                  </h3>
                  <div className="max-h-24 overflow-y-auto space-y-1 text-xs text-rose-900">
                    {alerts.expired?.length === 0 ? (
                      <p>No expired stock in inventory.</p>
                    ) : (
                      alerts.expired?.map((b) => (
                        <div key={b.id} className="flex justify-between">
                          <span>{b.medicine?.name} ({b.batchNumber})</span>
                          <span className="font-semibold text-rose-700">Expired: {new Date(b.expiryDate).toLocaleDateString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="w-full md:w-1/3">
                  <input
                    type="text"
                    placeholder="Search medicine by name..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-500">Sort By:</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="border rounded-md px-2 py-1 text-sm"
                  >
                    <option value="name">Name</option>
                    <option value="category">Category</option>
                  </select>
                  <button
                    onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
                    className="border rounded-md px-3 py-1 text-sm bg-slate-50 font-medium"
                  >
                    {order.toUpperCase()}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b text-slate-600 font-semibold text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3">Medicine Name</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Sellable (In-Date) Stock</th>
                      <th className="px-4 py-3">Batches Breakdown (FEFO Order)</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {medicines.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-400">
                          No matching medicines found.
                        </td>
                      </tr>
                    ) : (
                      medicines.map((med) => (
                        <tr key={med.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{med.name}</td>
                          <td className="px-4 py-3 text-slate-500">{med.category}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              med.inDateStock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {med.inDateStock} units in-date
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {med.batches?.map((b: any) => {
                                const isExpired = new Date(b.expiryDate) <= new Date();
                                return (
                                  <span
                                    key={b.id}
                                    className={`text-[11px] px-2 py-0.5 rounded border ${
                                      isExpired
                                        ? 'bg-rose-50 border-rose-200 text-rose-700 line-through'
                                        : 'bg-slate-50 border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    {b.batchNumber}: {b.quantity} qty (Exp: {new Date(b.expiryDate).toLocaleDateString()})
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setDispenseTarget(med)}
                              disabled={med.inDateStock === 0}
                              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 rounded transition"
                            >
                              Dispense FEFO
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                <div className="p-4 border-t border-slate-100 flex justify-between items-center text-xs">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="border px-3 py-1 rounded disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="border px-3 py-1 rounded disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-sm mb-3">Add New Medicine</h3>
                  <form onSubmit={handleAddMedicine} className="space-y-3">
                    <input
                      type="text"
                      placeholder="Medicine Name (e.g., Ibuprofen 400mg)"
                      value={newMedName}
                      onChange={(e) => setNewMedName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-xs"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Category (e.g., NSAID)"
                      value={newMedCategory}
                      onChange={(e) => setNewMedCategory(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-xs"
                    />
                    <button type="submit" className="w-full bg-slate-800 hover:bg-black text-white text-xs py-2 rounded font-medium">
                      Create Medicine
                    </button>
                  </form>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-sm mb-3">Ingest Batch into Inventory</h3>
                  <form onSubmit={handleAddBatch} className="space-y-2">
                    <select
                      value={batchMedId}
                      onChange={(e) => setBatchMedId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-xs"
                      required
                    >
                      <option value="">Select Medicine</option>
                      {medicines.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Batch #"
                        value={batchNum}
                        onChange={(e) => setBatchNum(e.target.value)}
                        className="px-2 py-2 border rounded-md text-xs"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={batchQty}
                        onChange={(e) => setBatchQty(e.target.value)}
                        className="px-2 py-2 border rounded-md text-xs"
                        required
                      />
                      <input
                        type="date"
                        value={batchExp}
                        onChange={(e) => setBatchExp(e.target.value)}
                        className="px-2 py-2 border rounded-md text-xs"
                        required
                      />
                    </div>
                    <button type="submit" className="w-full bg-slate-800 hover:bg-black text-white text-xs py-2 rounded font-medium">
                      Receive Batch
                    </button>
                  </form>
                </div>
              </div>

              {dispenseTarget && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
                    <h3 className="text-base font-bold">Dispense {dispenseTarget.name}</h3>
                    <p className="text-xs text-slate-500">
                      Available in-date units: <b>{dispenseTarget.inDateStock}</b>. The system will automatically allocate starting from the batch expiring soonest.
                    </p>
                    <input
                      type="number"
                      placeholder="Quantity to dispense"
                      min="1"
                      max={dispenseTarget.inDateStock}
                      value={dispenseQty}
                      onChange={(e) => setDispenseQty(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleDispense}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg text-xs"
                      >
                        Confirm Dispense
                      </button>
                      <button
                        onClick={() => setDispenseTarget(null)}
                        className="border px-4 py-2 rounded-lg text-xs font-medium text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      )}
    </div>
  );
}
