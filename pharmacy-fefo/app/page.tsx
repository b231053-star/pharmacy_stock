'use client';

import React, { useState, useEffect } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'landing' | 'app'>('app');
  const [user, setUser] = useState<any>({ name: 'Dr. Pharmacist', email: 'admin@pharmacy.com' });
  const [simulatedDays, setSimulatedDays] = useState(0);

  // Data states
  const [medicines, setMedicines] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Alerts & Activities
  const [alerts, setAlerts] = useState<{ expiringSoon: any[]; expired: any[] }>({ expiringSoon: [], expired: [] });
  const [dispenseTarget, setDispenseTarget] = useState<any>(null);
  const [dispenseQty, setDispenseQty] = useState('');
  const [recentAudits, setRecentAudits] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState('');

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
    fetchMedicines();
    fetchAlerts();
  }, [search, sort, order, page]);

  // Dispense Action (Atomic FEFO)
  const handleDispense = async () => {
    if (!dispenseTarget || !dispenseQty) return;
    try {
      const res = await fetch('/api/dispense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicineId: dispenseTarget.id, quantity: parseInt(dispenseQty) }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(`✅ Dispensed ${dispenseQty} units of ${dispenseTarget.name} via FEFO.`);
        setRecentAudits((prev) => [
          {
            medName: dispenseTarget.name,
            qty: dispenseQty,
            batches: data.batchesDeducted || [],
            time: new Date().toLocaleTimeString(),
          },
          ...prev.slice(0, 4),
        ]);
        setDispenseTarget(null);
        setDispenseQty('');
        fetchMedicines();
        fetchAlerts();
      } else {
        alert(data.error || 'Dispense failed');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Time-Travel / Clock Simulator
  const handleSimulateClock = async (days: number) => {
    setSimulatedDays(days);
    const targetDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    try {
      await fetch('/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ now: targetDate.toISOString() }),
      });
      setStatusMessage(`🕒 Fast-forwarded time by +${days} days. Expiry boundaries refreshed.`);
      fetchMedicines();
      fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  // Helper for visual batch urgency
  const getBatchUrgency = (expiryDateStr: string) => {
    const now = new Date(Date.now() + simulatedDays * 24 * 60 * 60 * 1000);
    const expiry = new Date(expiryDateStr);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return {
        label: `EXPIRED (${Math.abs(diffDays)}d ago)`,
        style: 'bg-rose-100 text-rose-800 border-rose-300 line-through opacity-80',
      };
    }
    if (diffDays <= 15) {
      return {
        label: `${diffDays}d left (CRITICAL)`,
        style: 'bg-amber-100 text-amber-900 border-amber-300 font-bold animate-pulse ring-1 ring-amber-400',
      };
    }
    if (diffDays <= 30) {
      return {
        label: `${diffDays}d left (EXPIRING SOON)`,
        style: 'bg-yellow-50 text-yellow-800 border-yellow-200 font-semibold',
      };
    }
    return {
      label: `${diffDays}d shelf-life`,
      style: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-3.5 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-black text-xl shadow-sm">
            Rx
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-slate-800 tracking-tight">PharmaFEFO</h1>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                PROD-READY
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Oldest-First Smart Dispensing System</p>
          </div>
        </div>

        {/* Navigation & User Pill */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('landing')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              activeTab === 'landing' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 border'
            }`}
          >
            Product Overview
          </button>
          <button
            onClick={() => setActiveTab('app')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              activeTab === 'app' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900 border'
            }`}
          >
            Dispenser Console
          </button>
          <div className="hidden sm:flex text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md font-mono border">
            {user.email}
          </div>
        </div>
      </header>

      {/* VIEW 1: ONE-PAGE PRODUCT LANDING */}
      {activeTab === 'landing' && (
        <main className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center space-y-4 mb-12">
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-300">
              Zero-Waste Patient Safety
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Deterministic FEFO Medicine Allocation.
            </h1>
            <p className="text-slate-600 max-w-xl mx-auto text-base">
              Eliminates human picking errors, isolates expired batches at the database layer, and guarantees that older inventory is depleted first.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 mb-12">
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-1 text-sm">Strict FEFO Sorting</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Database queries order valid stock strictly by <code className="font-mono text-emerald-700">expiryDate ASC</code>, depleting batches nearing expiration first.
              </p>
            </div>
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-1 text-sm">Dynamic In-Date Radar</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Aggregates sellable stock on the fly. Expired units are excluded from dispense pools without manual intervention.
              </p>
            </div>
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-1 text-sm">Early Warning System</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automatically quarantines expired lots and flags batches with &le; 15 days of remaining shelf-life.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-6 mb-10 text-xs leading-relaxed space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-emerald-400">Target Audience & Next 3 Releases</h4>
            <p className="text-slate-300">
              Built for retail community pharmacies, outpatient dispensaries, and regional medical distributors.
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>GS1 DataMatrix 2D Barcode scanner integration for high-throughput intake.</li>
              <li>Automated return credit generation for supplier write-offs.</li>
              <li>Multi-location inter-depot stock rebalancing.</li>
            </ol>
          </div>
        </main>
      )}

      {/* VIEW 2: OPERATIONAL CONSOLE */}
      {activeTab === 'app' && (
        <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
          {/* Notification Banner */}
          {statusMessage && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2.5 rounded-lg text-xs flex justify-between items-center shadow-sm">
              <span>{statusMessage}</span>
              <button onClick={() => setStatusMessage('')} className="font-bold text-emerald-700 ml-4 hover:opacity-75">
                ✕
              </button>
            </div>
          )}

          {/* Time-Travel Simulator Bar */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-xl shadow flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">⏱️ Interactive Expiry Time-Travel</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                  OFFSET: +{simulatedDays} DAYS
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Simulate shelf aging to verify that badges transition and expired batches are excluded.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => handleSimulateClock(0)}
                className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-white font-medium border border-slate-600 transition"
              >
                Reset (Today)
              </button>
              <button
                onClick={() => handleSimulateClock(simulatedDays + 15)}
                className="bg-amber-600 hover:bg-amber-500 px-3 py-1.5 rounded text-white font-medium transition"
              >
                +15 Days
              </button>
              <button
                onClick={() => handleSimulateClock(simulatedDays + 45)}
                className="bg-rose-700 hover:bg-rose-600 px-3 py-1.5 rounded text-white font-medium transition"
              >
                +45 Days
              </button>
            </div>
          </div>

          {/* Search, Filter & Quick Stats */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-1/2">
              <input
                type="text"
                placeholder="🔍 Search medicine by name (e.g. Paracetamol)..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-3 text-xs w-full md:w-auto justify-end">
              <span className="text-slate-500 font-medium">Sort By:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="border rounded-md px-2 py-1 bg-white"
              >
                <option value="name">Name</option>
                <option value="category">Category</option>
              </select>
              <button
                onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
                className="border rounded-md px-2.5 py-1 bg-slate-100 hover:bg-slate-200 font-mono font-bold"
              >
                {order.toUpperCase()}
              </button>
            </div>
          </div>

          {/* Inventory Table with FEFO Visual Badges */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Medicine & Category</th>
                  <th className="px-4 py-3">Sellable (In-Date) Units</th>
                  <th className="px-4 py-3">Batches (FEFO Dispensing Sequence)</th>
                  <th className="px-4 py-3 text-right">Dispense</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medicines.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-400">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  medicines.map((med) => (
                    <tr key={med.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800 text-sm">{med.name}</div>
                        <div className="text-[11px] text-slate-400">{med.category}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full font-bold text-xs ${
                            med.inDateStock > 0
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {med.inDateStock} units in-date
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1.5 max-w-xl">
                          {med.batches.map((b: any) => {
                            const urgency = getBatchUrgency(b.expiryDate);
                            return (
                              <div
                                key={b.id}
                                className={`px-2 py-1 rounded-md border text-[11px] flex items-center gap-1.5 shadow-xs ${urgency.style}`}
                              >
                                <span className="font-mono font-bold">{b.batchNumber}:</span>
                                <span>{b.quantity} qty</span>
                                <span className="text-[9px] uppercase tracking-wider font-semibold opacity-90">
                                  ({urgency.label})
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setDispenseTarget(med)}
                          disabled={med.inDateStock === 0}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold px-3 py-1.5 rounded shadow-xs transition"
                        >
                          Dispense
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="px-4 py-3 border-t border-slate-100 flex justify-between items-center text-xs">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="border px-3 py-1 rounded hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="font-medium text-slate-500">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="border px-3 py-1 rounded hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>

          {/* Real-Time FEFO Audit Trail */}
          {recentAudits.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">
                📋 Live FEFO Dispense Activity Log (Atomic Deductions)
              </h3>
              <div className="space-y-2">
                {recentAudits.map((item, idx) => (
                  <div key={idx} className="text-xs bg-slate-50 p-2.5 rounded border flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800">{item.medName}</span> &times; {item.qty} units
                      <span className="text-slate-400 ml-2 font-mono">[{item.time}]</span>
                    </div>
                    <div className="flex gap-1">
                      {item.batches.map((b: any, bIdx: number) => (
                        <span key={bIdx} className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono text-[10px]">
                          {b.batchNumber}: -{b.deducted}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal for Dispense */}
          {dispenseTarget && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl border">
                <h3 className="font-bold text-sm text-slate-800">
                  Dispense {dispenseTarget.name}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Available in-date units: <b>{dispenseTarget.inDateStock}</b>. The system will automatically allocate units from batches in order of nearest expiration date first.
                </p>
                <input
                  type="number"
                  placeholder="Enter quantity"
                  min="1"
                  max={dispenseTarget.inDateStock}
                  value={dispenseQty}
                  onChange={(e) => setDispenseQty(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDispense}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg text-xs transition"
                  >
                    Execute Dispense
                  </button>
                  <button
                    onClick={() => setDispenseTarget(null)}
                    className="border px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}