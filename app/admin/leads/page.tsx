'use client';

import { useEffect, useState, useCallback } from 'react';

interface Lead {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  company: string | null;
  partnerSource: string | null;
  monthlyRevenue: number;
  recommendedPlan: string;
  netAnnualSavings: number;
  roiPercent: number;
  intent: string;
}

function formatEuro(value: number) {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(value) + ' €';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLeads = useCallback(async (p: number, s: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20', search: s });
      const res = await fetch(`/api/admin/leads?${params}`);
      if (!res.ok) throw new Error('Fehler beim Laden der Leads');
      const data = await res.json();
      setLeads(data.leads ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads(page, search);
  }, [page, search, fetchLeads]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function downloadCSV() {
    const headers = [
      'Datum', 'Name', 'Email', 'Unternehmen', 'Partner',
      'Monatl. Umsatz', 'Empf. Plan', 'Einsparpotenzial', 'ROI', 'Anfrage'
    ];
    const rows = leads.map((l) => [
      formatDate(l.createdAt),
      l.name,
      l.email,
      l.company ?? '',
      l.partnerSource ?? '',
      l.monthlyRevenue,
      l.recommendedPlan,
      l.netAnnualSavings,
      Math.round(l.roiPercent),
      l.intent,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} Leads gesamt</p>
        </div>
        <button
          onClick={downloadCSV}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          CSV exportieren
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Nach Name, E-Mail, Unternehmen oder Partner suchen..."
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Suchen
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
            className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Zurücksetzen
          </button>
        )}
      </form>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600 mb-4">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Datum', 'Name', 'Email', 'Unternehmen', 'Partner', 'Monatl. Umsatz', 'Empf. Plan', 'Einsparpotenzial', 'ROI', 'Anfrage'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">Laden...</td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">Keine Leads gefunden</td>
              </tr>
            ) : (
              leads.map((lead, i) => (
                <tr key={lead.id} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(lead.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{lead.name}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.email}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.company ?? '–'}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.partnerSource ?? '–'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatEuro(lead.monthlyRevenue)}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{lead.recommendedPlan}</td>
                  <td className="px-4 py-3 text-green-600 font-medium whitespace-nowrap">{formatEuro(lead.netAnnualSavings)}</td>
                  <td className="px-4 py-3 text-indigo-600 font-medium whitespace-nowrap">{Math.round(lead.roiPercent)}%</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      lead.intent === 'consultation' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {lead.intent === 'consultation' ? 'Beratung' : 'Angebot'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Seite {page} von {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Zurück
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Weiter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
