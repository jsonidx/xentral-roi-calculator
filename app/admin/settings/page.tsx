'use client';

import { useEffect, useState, useCallback } from 'react';
import { XentralPlanRow, SERVICE_PACKAGE_ORDER, getServicePackageLabel, getPlanTierLabel } from '@/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────

interface RefEntry {
  id: string;
  key: string;
  value: number;
  label: string;
  description: string | null;
}

type BillingTab = 'monthly' | 'annual' | '2year';

const BILLING_TABS: { key: BillingTab; label: string }[] = [
  { key: 'monthly', label: 'Monatsvertrag' },
  { key: 'annual',  label: 'Jahresvertrag (12 Mo.)' },
  { key: '2year',   label: '2-Jahresvertrag' },
];

const PLAN_TIERS = ['starter', 'business', 'pro'] as const;

function getFeeField(tab: BillingTab): keyof XentralPlanRow {
  if (tab === 'monthly') return 'monthlyFeeMonthly';
  if (tab === 'annual')  return 'monthlyFeeAnnual';
  return 'monthlyFee2Year';
}

function isFactor(value: number) {
  return value >= 0 && value <= 1;
}

// Revenue band label helpers
const BAND_LABELS: Record<string, string> = {
  standard_s: '0 – 750k €',
  standard_m: '750k – 1,5 Mio. €',
  standard_l: '1,5 – 2,5 Mio. €',
  growth_s:   '2,5 – 5 Mio. €',
  growth_m:   '5 – 10 Mio. €',
  growth_l:   '10 – 15 Mio. €',
  premium_s:  '15 – 20 Mio. €',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  // Plan matrix state
  const [planMatrix, setPlanMatrix] = useState<XentralPlanRow[]>([]);
  const [billingTab, setBillingTab] = useState<BillingTab>('monthly');
  // planEdits: { [planId]: { monthlyFeeMonthly | monthlyFeeAnnual | monthlyFee2Year: string } }
  const [planEdits, setPlanEdits] = useState<Record<string, Record<string, string>>>({});
  const [savingRow, setSavingRow]   = useState<Record<string, boolean>>({});
  const [rowMessages, setRowMessages] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({});

  // Overage editing: { [planTier]: { band1, band2, band3, includedMonthly, includedAnnual } }
  const [overageEdits, setOverageEdits] = useState<Record<string, Record<string, string>>>({});
  const [overageSaving, setOverageSaving] = useState<Record<string, boolean>>({});
  const [overageMessages, setOverageMessages] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({});

  // Reference data
  const [refData, setRefData] = useState<RefEntry[]>([]);
  const [refForms, setRefForms] = useState<Record<string, string>>({});
  const [refSaving, setRefSaving] = useState<Record<string, boolean>>({});
  const [refMessages, setRefMessages] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({});

  const [error, setError] = useState('');

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/plans').then((r) => r.json()),
      fetch('/api/admin/reference-data').then((r) => r.json()),
    ])
      .then(([plansData, refDataResp]) => {
        const matrix: XentralPlanRow[] = plansData.plans ?? [];
        setPlanMatrix(matrix);
        initPlanEdits(matrix);
        initOverageEdits(matrix);

        const refs: RefEntry[] = refDataResp.data ?? [];
        setRefData(refs);
        const initRef: Record<string, string> = {};
        for (const entry of refs) {
          initRef[entry.key] = isFactor(entry.value)
            ? String(Math.round(entry.value * 100))
            : String(entry.value);
        }
        setRefForms(initRef);
      })
      .catch(() => setError('Fehler beim Laden der Einstellungen'));
  }, []);

  function initPlanEdits(matrix: XentralPlanRow[]) {
    const edits: Record<string, Record<string, string>> = {};
    for (const p of matrix) {
      edits[p.id] = {
        monthlyFeeMonthly: String(p.monthlyFeeMonthly),
        monthlyFeeAnnual:  String(p.monthlyFeeAnnual),
        monthlyFee2Year:   String(p.monthlyFee2Year),
      };
    }
    setPlanEdits(edits);
  }

  function initOverageEdits(matrix: XentralPlanRow[]) {
    const edits: Record<string, Record<string, string>> = {};
    for (const tier of PLAN_TIERS) {
      // Use the first active plan for this tier as the representative values
      const rep = matrix.find((p) => p.planTier === tier && p.isActive);
      if (rep) {
        edits[tier] = {
          band1:           String(rep.overage1To1000),
          band2:           String(rep.overage1001To5000),
          band3:           String(rep.overage5001To10000),
          includedMonthly: String(rep.includedOrdersMonthly),
          includedAnnual:  String(rep.includedOrdersAnnual),
        };
      }
    }
    setOverageEdits(edits);
  }

  // ── Plan fee inline edit ──────────────────────────────────────────────────

  function handleFeeChange(planId: string, field: string, value: string) {
    setPlanEdits((prev) => ({
      ...prev,
      [planId]: { ...(prev[planId] ?? {}), [field]: value },
    }));
  }

  // Save all three planTier fee values for a given servicePackage row
  const saveRow = useCallback(async (servicePackage: string) => {
    setSavingRow((prev) => ({ ...prev, [servicePackage]: true }));
    setRowMessages((prev) => ({ ...prev, [servicePackage]: { type: 'success', text: '' } }));

    try {
      const plansForRow = PLAN_TIERS.map((tier) =>
        planMatrix.find((p) => p.planTier === tier && p.servicePackage === servicePackage)
      ).filter(Boolean) as XentralPlanRow[];

      for (const p of plansForRow) {
        const edits = planEdits[p.id] ?? {};
        await fetch('/api/admin/plans', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: p.id,
            monthlyFeeMonthly: Number(edits.monthlyFeeMonthly ?? p.monthlyFeeMonthly),
            monthlyFeeAnnual:  Number(edits.monthlyFeeAnnual  ?? p.monthlyFeeAnnual),
            monthlyFee2Year:   Number(edits.monthlyFee2Year   ?? p.monthlyFee2Year),
          }),
        }).then((r) => {
          if (!r.ok) throw new Error('Fehler beim Speichern');
        });
      }

      // Sync planMatrix state with saved values
      setPlanMatrix((prev) =>
        prev.map((p) => {
          if (p.servicePackage !== servicePackage) return p;
          const edits = planEdits[p.id] ?? {};
          return {
            ...p,
            monthlyFeeMonthly: Number(edits.monthlyFeeMonthly ?? p.monthlyFeeMonthly),
            monthlyFeeAnnual:  Number(edits.monthlyFeeAnnual  ?? p.monthlyFeeAnnual),
            monthlyFee2Year:   Number(edits.monthlyFee2Year   ?? p.monthlyFee2Year),
          };
        })
      );

      setRowMessages((prev) => ({ ...prev, [servicePackage]: { type: 'success', text: 'Gespeichert!' } }));
    } catch (e: any) {
      setRowMessages((prev) => ({ ...prev, [servicePackage]: { type: 'error', text: e.message ?? 'Fehler' } }));
    } finally {
      setSavingRow((prev) => ({ ...prev, [servicePackage]: false }));
    }
  }, [planMatrix, planEdits]);

  // ── Overage save ──────────────────────────────────────────────────────────

  const saveOverage = useCallback(async (tier: string) => {
    setOverageSaving((prev) => ({ ...prev, [tier]: true }));
    setOverageMessages((prev) => ({ ...prev, [tier]: { type: 'success', text: '' } }));

    try {
      const edits = overageEdits[tier] ?? {};
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updateManyByTier:     true,
          planTier:             tier,
          overage1To1000:       Number(edits.band1),
          overage1001To5000:    Number(edits.band2),
          overage5001To10000:   Number(edits.band3),
          includedOrdersMonthly: Number(edits.includedMonthly),
          includedOrdersAnnual:  Number(edits.includedAnnual),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Fehler');

      // Sync local state
      setPlanMatrix((prev) =>
        prev.map((p) => {
          if (p.planTier !== tier) return p;
          return {
            ...p,
            overage1To1000:        Number(edits.band1),
            overage1001To5000:     Number(edits.band2),
            overage5001To10000:    Number(edits.band3),
            includedOrdersMonthly: Number(edits.includedMonthly),
            includedOrdersAnnual:  Number(edits.includedAnnual),
          };
        })
      );

      setOverageMessages((prev) => ({ ...prev, [tier]: { type: 'success', text: 'Gespeichert!' } }));
    } catch (e: any) {
      setOverageMessages((prev) => ({ ...prev, [tier]: { type: 'error', text: e.message ?? 'Fehler' } }));
    } finally {
      setOverageSaving((prev) => ({ ...prev, [tier]: false }));
    }
  }, [overageEdits]);

  // ── Reference data save ───────────────────────────────────────────────────

  async function saveRef(entry: RefEntry) {
    const rawValue = refForms[entry.key];
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
      setRefData((prev) => prev.map((e) => (e.key === entry.key ? { ...e, value: numValue } : e)));
      setRefMessages((prev) => ({ ...prev, [entry.key]: { type: 'success', text: 'Gespeichert!' } }));
    } catch (e: any) {
      setRefMessages((prev) => ({ ...prev, [entry.key]: { type: 'error', text: e.message } }));
    } finally {
      setRefSaving((prev) => ({ ...prev, [entry.key]: false }));
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const hasPlanMatrix = planMatrix.length > 0;
  const feeField = getFeeField(billingTab);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Einstellungen</h1>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600 mb-6">{error}</div>
      )}

      {/* ── Section 1: Plan Matrix ──────────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Preispläne</h2>

        {!hasPlanMatrix ? (
          <p className="text-sm text-gray-400">Keine Pläne vorhanden (Datenbank nicht konfiguriert oder leer)</p>
        ) : (
          <>
            {/* Billing cycle tabs */}
            <div className="flex gap-1.5 mb-4">
              {BILLING_TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setBillingTab(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    billingTab === key
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {label}
                  {key === 'annual'  && <span className="ml-1.5 text-xs opacity-70">−5%</span>}
                  {key === '2year'   && <span className="ml-1.5 text-xs opacity-70">−10%</span>}
                </button>
              ))}
            </div>

            {/* Matrix table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 min-w-[160px]">
                      Umsatz-Band (jährl.)
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">
                      Service-Paket
                    </th>
                    {PLAN_TIERS.map((tier) => (
                      <th key={tier} className="text-right px-5 py-3 text-xs font-semibold text-gray-500 min-w-[130px]">
                        {getPlanTierLabel(tier)} / Mo.
                      </th>
                    ))}
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {SERVICE_PACKAGE_ORDER.map((sp, rowIdx) => {
                    const msg = rowMessages[sp];
                    return (
                      <tr key={sp} className={`border-b border-gray-50 ${rowIdx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                        {/* Revenue band */}
                        <td className="px-5 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">
                          {BAND_LABELS[sp] ?? '–'}
                        </td>

                        {/* Service package name */}
                        <td className="px-5 py-3">
                          <span className="text-sm font-semibold text-gray-700">
                            {getServicePackageLabel(sp)}
                          </span>
                        </td>

                        {/* One editable fee cell per plan tier */}
                        {PLAN_TIERS.map((tier) => {
                          const plan = planMatrix.find(
                            (p) => p.planTier === tier && p.servicePackage === sp
                          );
                          if (!plan) {
                            return <td key={tier} className="px-5 py-3 text-center text-gray-300">–</td>;
                          }
                          const editVal = planEdits[plan.id]?.[feeField as string] ?? String(plan[feeField]);
                          return (
                            <td key={tier} className="px-5 py-3 text-right">
                              <div className="relative inline-flex items-center">
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={editVal}
                                  onChange={(e) => handleFeeChange(plan.id, feeField as string, e.target.value)}
                                  className="w-24 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-right text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
                                />
                                <span className="ml-1 text-xs text-gray-400">€</span>
                              </div>
                            </td>
                          );
                        })}

                        {/* Row save button + message */}
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-3">
                            {msg?.text && (
                              <span className={`text-xs font-medium ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                {msg.text}
                              </span>
                            )}
                            <button
                              onClick={() => saveRow(sp)}
                              disabled={savingRow[sp]}
                              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium text-xs px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {savingRow[sp] ? '...' : 'Speichern'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Overage pricing section ─────────────────────────────────── */}
            <h3 className="text-base font-semibold text-gray-700 mt-8 mb-3">Variable Bestellkosten</h3>
            <p className="text-xs text-gray-400 mb-3">
              Kosten pro Extrabestellung oberhalb des inkludierten Volumens (Monatsvertrag). Änderungen gelten für alle Service-Pakete des jeweiligen Tiers.
            </p>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 min-w-[220px]">
                      Band
                    </th>
                    {PLAN_TIERS.map((tier) => (
                      <th key={tier} className="text-right px-5 py-3 text-xs font-semibold text-gray-500 min-w-[120px]">
                        {getPlanTierLabel(tier)}
                      </th>
                    ))}
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {/* Included orders row */}
                  <tr className="border-b border-gray-50 bg-white">
                    <td className="px-5 py-3 text-sm text-gray-700 font-medium">
                      Inkl. Bestellungen / Monat
                    </td>
                    {PLAN_TIERS.map((tier) => (
                      <td key={tier} className="px-5 py-3 text-right">
                        <div className="relative inline-flex items-center">
                          <input
                            type="number"
                            min={0}
                            step={100}
                            value={overageEdits[tier]?.includedMonthly ?? ''}
                            onChange={(e) =>
                              setOverageEdits((prev) => ({
                                ...prev,
                                [tier]: { ...(prev[tier] ?? {}), includedMonthly: e.target.value },
                              }))
                            }
                            className="w-24 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-right text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
                          />
                        </div>
                      </td>
                    ))}
                    <td className="px-5 py-3" />
                  </tr>

                  {/* Overage band rows */}
                  {[
                    { field: 'band1', label: '1 – 1.000 Extrabestellungen' },
                    { field: 'band2', label: '1.001 – 5.000 Extrabestellungen' },
                    { field: 'band3', label: '5.001 – 10.000 Extrabestellungen' },
                  ].map(({ field, label }, rowIdx) => (
                    <tr key={field} className={`border-b border-gray-50 ${rowIdx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                      <td className="px-5 py-3 text-sm text-gray-700">{label}</td>
                      {PLAN_TIERS.map((tier) => {
                        const msg = overageMessages[tier];
                        return (
                          <td key={tier} className="px-5 py-3 text-right">
                            <div className="relative inline-flex items-center">
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={overageEdits[tier]?.[field] ?? ''}
                                onChange={(e) =>
                                  setOverageEdits((prev) => ({
                                    ...prev,
                                    [tier]: { ...(prev[tier] ?? {}), [field]: e.target.value },
                                  }))
                                }
                                className="w-20 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-right text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
                              />
                              <span className="ml-1 text-xs text-gray-400">€</span>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-5 py-3" />
                    </tr>
                  ))}

                  {/* Save row per tier */}
                  <tr className="bg-white">
                    <td className="px-5 py-3 text-xs text-gray-400">Speichern gilt für alle Service-Pakete des Tiers</td>
                    {PLAN_TIERS.map((tier) => {
                      const msg = overageMessages[tier];
                      return (
                        <td key={tier} className="px-5 py-3 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <button
                              onClick={() => saveOverage(tier)}
                              disabled={overageSaving[tier]}
                              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                            >
                              {overageSaving[tier] ? '...' : `${getPlanTierLabel(tier)} speichern`}
                            </button>
                            {msg?.text && (
                              <span className={`text-xs font-medium ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                {msg.text}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-5 py-3" />
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* ── Section 2: Reference Data ───────────────────────────────────────── */}
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
                          {msg?.text && (
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
