'use client';

import { useEffect, useState } from 'react';

interface Plan {
  id: string;
  name: string;
  servicePackage: string;
  monthlyFee: number;
  maxMonthlyRevenue: number | null;
  sortOrder: number;
}

interface RefEntry {
  id: string;
  key: string;
  value: number;
  label: string;
  description: string | null;
}

// Is this a factor (0–1 range)? We detect by checking if stored value is between 0 and 1.
function isFactor(value: number) {
  return value >= 0 && value <= 1;
}

export default function AdminSettingsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [refData, setRefData] = useState<RefEntry[]>([]);
  const [planForms, setPlanForms] = useState<Record<string, Partial<Plan>>>({});
  const [refForms, setRefForms] = useState<Record<string, string>>({});
  const [planSaving, setPlanSaving] = useState<Record<string, boolean>>({});
  const [refSaving, setRefSaving] = useState<Record<string, boolean>>({});
  const [planMessages, setPlanMessages] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({});
  const [refMessages, setRefMessages] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/plans').then((r) => r.json()),
      fetch('/api/admin/reference-data').then((r) => r.json()),
    ])
      .then(([plansData, refDataResp]) => {
        const p: Plan[] = plansData.plans ?? [];
        setPlans(p);
        const initForms: Record<string, Partial<Plan>> = {};
        for (const plan of p) {
          initForms[plan.id] = {
            name: plan.name,
            servicePackage: plan.servicePackage,
            monthlyFee: plan.monthlyFee,
            maxMonthlyRevenue: plan.maxMonthlyRevenue,
          };
        }
        setPlanForms(initForms);

        const refs: RefEntry[] = refDataResp.data ?? [];
        setRefData(refs);
        const initRef: Record<string, string> = {};
        for (const entry of refs) {
          // Display factor values as percentage
          initRef[entry.key] = isFactor(entry.value)
            ? String(Math.round(entry.value * 100))
            : String(entry.value);
        }
        setRefForms(initRef);
      })
      .catch(() => setError('Fehler beim Laden der Einstellungen'));
  }, []);

  function updatePlanForm(id: string, field: keyof Plan, value: string | number | null) {
    setPlanForms((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function savePlan(plan: Plan) {
    const form = planForms[plan.id];
    setPlanSaving((prev) => ({ ...prev, [plan.id]: true }));
    setPlanMessages((prev) => ({ ...prev, [plan.id]: { type: 'success', text: '' } }));
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: plan.id,
          name: form.name,
          servicePackage: form.servicePackage,
          monthlyFee: Number(form.monthlyFee),
          maxMonthlyRevenue:
            form.maxMonthlyRevenue === null || form.maxMonthlyRevenue === undefined
              ? null
              : Number(form.maxMonthlyRevenue),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Fehler');
      setPlanMessages((prev) => ({ ...prev, [plan.id]: { type: 'success', text: 'Gespeichert!' } }));
    } catch (e: any) {
      setPlanMessages((prev) => ({ ...prev, [plan.id]: { type: 'error', text: e.message } }));
    } finally {
      setPlanSaving((prev) => ({ ...prev, [plan.id]: false }));
    }
  }

  async function saveRef(entry: RefEntry) {
    const rawValue = refForms[entry.key];
    // Convert: if it was a factor, divide by 100
    const numValue = isFactor(entry.value) ? Number(rawValue) / 100 : Number(rawValue);
    setRefSaving((prev) => ({ ...prev, [entry.key]: true }));
    setRefMessages((prev) => ({ ...prev, [entry.key]: { type: 'success', text: '' } }));
    try {
      const res = await fetch('/api/admin/reference-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: entry.key, value: numValue }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Fehler');
      // Update local state so isFactor check is still correct
      setRefData((prev) => prev.map((e) => (e.key === entry.key ? { ...e, value: numValue } : e)));
      setRefMessages((prev) => ({ ...prev, [entry.key]: { type: 'success', text: 'Gespeichert!' } }));
    } catch (e: any) {
      setRefMessages((prev) => ({ ...prev, [entry.key]: { type: 'error', text: e.message } }));
    } finally {
      setRefSaving((prev) => ({ ...prev, [entry.key]: false }));
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Einstellungen</h1>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600 mb-6">{error}</div>
      )}

      {/* Section 1: Plans */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Preispläne</h2>
        {plans.length === 0 ? (
          <p className="text-sm text-gray-400">Keine Pläne vorhanden (Datenbank nicht konfiguriert oder leer)</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const form = planForms[plan.id] ?? {};
              const msg = planMessages[plan.id];
              return (
                <div key={plan.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <h3 className="text-sm font-bold text-gray-800">{plan.name}</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Plan Name</label>
                      <input
                        type="text"
                        value={form.name ?? ''}
                        onChange={(e) => updatePlanForm(plan.id, 'name', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Service-Paket</label>
                      <input
                        type="text"
                        value={form.servicePackage ?? ''}
                        onChange={(e) => updatePlanForm(plan.id, 'servicePackage', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Monatlicher Preis</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={form.monthlyFee ?? 0}
                          onChange={(e) => updatePlanForm(plan.id, 'monthlyFee', Number(e.target.value))}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-8 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">€</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Max. Monatsumsatz</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={form.maxMonthlyRevenue ?? ''}
                          placeholder="Unbegrenzt"
                          onChange={(e) =>
                            updatePlanForm(
                              plan.id,
                              'maxMonthlyRevenue',
                              e.target.value === '' ? null : Number(e.target.value)
                            )
                          }
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-8 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">€</span>
                      </div>
                    </div>
                  </div>

                  {msg && msg.text && (
                    <p className={`text-xs mt-3 font-medium ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {msg.text}
                    </p>
                  )}

                  <button
                    onClick={() => savePlan(plan)}
                    disabled={planSaving[plan.id]}
                    className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium text-sm py-2 rounded-lg transition-colors"
                  >
                    {planSaving[plan.id] ? 'Speichern...' : 'Speichern'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 2: Reference Data */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Berechnungsparameter</h2>
        {refData.length === 0 ? (
          <p className="text-sm text-gray-400">Keine Parameter vorhanden (Datenbank nicht konfiguriert oder leer)</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Parameter', 'Beschreibung', 'Wert', 'Einheit', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {refData.map((entry, i) => {
                  const factor = isFactor(entry.value);
                  const msg = refMessages[entry.key];
                  return (
                    <tr key={entry.key} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-800">{entry.label}</p>
                        <p className="text-xs text-gray-400 font-mono">{entry.key}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs max-w-xs">{entry.description ?? '–'}</td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          step={factor ? '1' : 'any'}
                          value={refForms[entry.key] ?? ''}
                          onChange={(e) =>
                            setRefForms((prev) => ({ ...prev, [entry.key]: e.target.value }))
                          }
                          className="w-28 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
                        />
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-sm font-medium">
                        {factor ? '%' : '€'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => saveRef(entry)}
                            disabled={refSaving[entry.key]}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                          >
                            {refSaving[entry.key] ? '...' : 'Speichern'}
                          </button>
                          {msg && msg.text && (
                            <span className={`text-xs font-medium ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                              {msg.text}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
