'use client';

import { useEffect, useState } from 'react';

interface Stats {
  totalLeads: number;
  monthLeads: number;
  avgSavings: number;
  avgROI: number;
  planDistribution: Record<string, number>;
  recentLeads: Array<{
    name: string;
    company: string | null;
    recommendedPlan: string;
    netAnnualSavings: number;
    roiPercent: number;
    createdAt: string;
  }>;
}

function formatEuro(value: number) {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(value) + ' €';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => {
        if (!r.ok) throw new Error('Fehler beim Laden der Statistiken');
        return r.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">{error}</div>
      </div>
    );
  }

  const planDistEntries = stats
    ? Object.entries(stats.planDistribution).sort((a, b) => b[1] - a[1])
    : [];
  const maxPlanCount = planDistEntries.length > 0 ? planDistEntries[0][1] : 1;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Leads gesamt"
          value={stats ? String(stats.totalLeads) : '–'}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          label="Leads diesen Monat"
          value={stats ? String(stats.monthLeads) : '–'}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="Ø Einsparpotenzial"
          value={stats ? formatEuro(stats.avgSavings) : '–'}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Ø ROI"
          value={stats ? `${Math.round(stats.avgROI)}%` : '–'}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* Plan distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Plan-Verteilung</h2>
          {planDistEntries.length === 0 ? (
            <p className="text-sm text-gray-400">Noch keine Daten</p>
          ) : (
            <div className="space-y-3">
              {planDistEntries.map(([plan, count]) => (
                <div key={plan}>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span className="font-medium truncate">{plan}</span>
                    <span className="ml-2 shrink-0">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${(count / maxPlanCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent leads table */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5 overflow-x-auto">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Letzte Leads</h2>
          {!stats || stats.recentLeads.length === 0 ? (
            <p className="text-sm text-gray-400">Noch keine Leads</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">Datum</th>
                  <th className="text-left pb-2 font-medium">Name</th>
                  <th className="text-left pb-2 font-medium">Unternehmen</th>
                  <th className="text-left pb-2 font-medium">Plan</th>
                  <th className="text-right pb-2 font-medium">Einsparung</th>
                  <th className="text-right pb-2 font-medium">ROI</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentLeads.map((lead, i) => (
                  <tr
                    key={i}
                    className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="py-2 text-gray-500">{formatDate(lead.createdAt)}</td>
                    <td className="py-2 font-medium text-gray-800">{lead.name}</td>
                    <td className="py-2 text-gray-600">{lead.company ?? '–'}</td>
                    <td className="py-2 text-gray-600 text-xs">{lead.recommendedPlan}</td>
                    <td className="py-2 text-right text-green-600 font-medium">
                      {formatEuro(lead.netAnnualSavings)}
                    </td>
                    <td className="py-2 text-right text-indigo-600 font-medium">
                      {Math.round(lead.roiPercent)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <span className="text-indigo-400">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
