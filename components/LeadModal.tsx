'use client';

import { useState, useEffect } from 'react';
import { CalculatorResults } from '@/lib/calculations';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  intent: 'consultation' | 'offer';
  partnerSource: string | null;
  inputs: {
    monthlyRevenue: number;
    aov: number;
    oosRateCurrent: number;
    oosRateXentral: number;
    timePerOrderManual: number;
    timePerOrderXentral: number;
    hourlyRate: number;
    pickErrorRate: number;
    costPerError: number;
  };
  results: CalculatorResults;
}

export default function LeadModal({
  isOpen,
  onClose,
  intent,
  partnerSource,
  inputs,
  results,
}: LeadModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setError('');
      setFormData({ name: '', email: '', company: '', phone: '' });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          intent,
          partnerSource,
          monthlyRevenue: inputs.monthlyRevenue,
          ordersPerMonth: results.ordersPerMonth,
          oosRateCurrent: inputs.oosRateCurrent,
          timePerOrderManual: inputs.timePerOrderManual,
          aov: inputs.aov,
          oosRateXentral: inputs.oosRateXentral,
          hourlyRate: inputs.hourlyRate,
          timePerOrderXentral: inputs.timePerOrderXentral,
          pickErrorRate: inputs.pickErrorRate,
          costPerError: inputs.costPerError,
          netAnnualSavings: results.netAnnualSavings,
          roiPercent: results.roiPercent,
          timeGainPerMonth: results.timeGainPerMonth,
          recommendedPlan: results.plan.name,
          monthlyPlanCost: results.plan.monthlyFee,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unbekannter Fehler');
      }

      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Senden. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const title =
    intent === 'consultation' ? 'Beratung buchen' : 'Angebot anfragen';
  const subtitle =
    intent === 'consultation'
      ? 'Unser Team meldet sich innerhalb von 24 Stunden bei dir.'
      : 'Wir erstellen dir ein individuelles Angebot auf Basis deiner Kalkulation.';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden">
        {/* Header */}
        <div className="bg-[#4F46E5] px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">{title}</h2>
              <p className="text-indigo-200 text-sm mt-1">{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="text-indigo-200 hover:text-white transition-colors ml-4 mt-0.5 flex-shrink-0"
              aria-label="Schließen"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {isSuccess ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Vielen Dank!</h3>
              <p className="text-gray-600 text-sm mb-2">
                Deine Anfrage wurde erfolgreich übermittelt.
              </p>
              <p className="text-gray-500 text-sm mb-6">
                Unser Team wird sich in Kürze bei dir melden.
              </p>
              <button
                onClick={onClose}
                className="bg-[#4F46E5] hover:bg-[#3730A3] text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
              >
                Schließen
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
                  placeholder="Max Mustermann"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
                  placeholder="max@unternehmen.de"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unternehmen{' '}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
                  placeholder="Musterfirma GmbH"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon{' '}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
                  placeholder="+49 89 123456"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Summary box */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-indigo-700 mb-1.5">
                  Dein Einsparpotenzial auf einen Blick:
                </p>
                <div className="flex justify-between text-xs text-indigo-600">
                  <span>Jährliche Einsparung</span>
                  <span className="font-bold">
                    {new Intl.NumberFormat('de-DE').format(Math.round(results.netAnnualSavings))} €
                  </span>
                </div>
                <div className="flex justify-between text-xs text-indigo-600 mt-0.5">
                  <span>ROI im ersten Jahr</span>
                  <span className="font-bold">
                    {new Intl.NumberFormat('de-DE').format(Math.round(results.roiPercent))}%
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#4F46E5] hover:bg-[#3730A3] disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Wird gesendet...
                  </>
                ) : (
                  title
                )}
              </button>

              <p className="text-xs text-gray-400 text-center">
                Mit dem Absenden stimmst du unserer Datenschutzerklärung zu.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
