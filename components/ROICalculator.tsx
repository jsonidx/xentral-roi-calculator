'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  calculate,
  formatEuro,
  formatNumber,
  formatPercent,
  CalculatorResults,
} from '@/lib/calculations';
import { XentralPlanRow } from '@/lib/types';
import LeadModal from './LeadModal';

// Dynamically import charts to avoid SSR issues
const SavingsBarChart = dynamic(() => import('./charts/SavingsBarChart'), {
  ssr: false,
  loading: () => <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />,
});

const BreakevenChart = dynamic(() => import('./charts/BreakevenChart'), {
  ssr: false,
  loading: () => <div className="h-56 bg-gray-50 rounded-xl animate-pulse" />,
});

const SLIDER_MIN = 0;
const SLIDER_MAX = 100_000_000;
const SLIDER_DEFAULT = 100_000;

type BillingCycle = 'monthly' | 'annual' | '2year';

interface ExpertSettings {
  aov: number;
  oosRateXentral: number;
  hourlyRate: number;
  timePerOrderXentral: number;
  pickErrorRate: number;
  costPerError: number;
}

const DEFAULT_EXPERT: ExpertSettings = {
  aov: 50,
  oosRateXentral: 2,
  hourlyRate: 35,
  timePerOrderXentral: 2,
  pickErrorRate: 2,
  costPerError: 35,
};

const DEFAULT_FACTORS = {
  errorReductionFactor: 0.90,
  oosMarginFactor: 0.30,
};

const BILLING_LABELS: Record<BillingCycle, string> = {
  monthly: 'Monatlich',
  annual:  'Jährlich',
  '2year': '2 Jahre',
};

export default function ROICalculator() {
  const searchParams = useSearchParams();
  const partnerSource = searchParams.get('partner');

  // Core inputs
  const [monthlyRevenue, setMonthlyRevenue] = useState(SLIDER_DEFAULT);
  const [oosRateCurrent, setOosRateCurrent] = useState(5);
  const [timePerOrderManual, setTimePerOrderManual] = useState(3);

  // Expert settings
  const [expert, setExpert] = useState<ExpertSettings>(DEFAULT_EXPERT);
  const [expertOpen, setExpertOpen] = useState(true);

  // Billing cycle (new expert setting)
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');

  // Reference factors from DB
  const [factors, setFactors] = useState(DEFAULT_FACTORS);

  // Plan matrix from DB
  const [planMatrix, setPlanMatrix] = useState<XentralPlanRow[]>([]);

  // Legacy plans (backward compat fallback)
  const [plans, setPlans] = useState<any[]>([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIntent, setModalIntent] = useState<'consultation' | 'offer'>('consultation');

  // Fetch reference data from API
  useEffect(() => {
    fetch('/api/reference-data')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setFactors({
            errorReductionFactor: json.data.error_reduction_factor ?? 0.90,
            oosMarginFactor: json.data.oos_margin_factor ?? 0.30,
          });
        }
        if (json.planMatrix && json.planMatrix.length > 0) {
          setPlanMatrix(json.planMatrix);
        } else if (json.plans) {
          setPlans(json.plans);
        }
      })
      .catch(() => {
        // Keep defaults
      });
  }, []);

  const inputs = useMemo(
    () => ({
      monthlyRevenue,
      aov: expert.aov,
      oosRateCurrent,
      oosRateXentral: expert.oosRateXentral,
      timePerOrderManual,
      timePerOrderXentral: expert.timePerOrderXentral,
      hourlyRate: expert.hourlyRate,
      pickErrorRate: expert.pickErrorRate,
      costPerError: expert.costPerError,
      errorReductionFactor: factors.errorReductionFactor,
      oosMarginFactor: factors.oosMarginFactor,
      plans,
      planMatrix,
      planTier: 'business' as const,
      billingCycle,
    }),
    [monthlyRevenue, oosRateCurrent, timePerOrderManual, expert, factors, plans, planMatrix, billingCycle]
  );

  const results: CalculatorResults = useMemo(() => calculate(inputs), [inputs]);

  const sliderPercent = ((monthlyRevenue - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;

  const handleExpertChange = useCallback(
    (key: keyof ExpertSettings, value: number) => {
      setExpert((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const openModal = (intent: 'consultation' | 'offer') => {
    setModalIntent(intent);
    setModalOpen(true);
  };

  const formatSliderLabel = (val: number) => {
    if (val === 0) return '0 €';
    if (val >= 1_000_000) return `${val / 1_000_000} Mio. €`;
    if (val >= 1_000) return `${val / 1_000}k €`;
    return `${val} €`;
  };

  const sliderTicks = [0, 25_000_000, 50_000_000, 75_000_000, 100_000_000];

  return (
    <>
      <div className="min-h-screen bg-[#F9FAFB] py-6 px-4">
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">ERP ROI Kalkulator</h1>
            <span className="text-xs font-medium bg-[#EEF2FF] text-[#4F46E5] px-2 py-0.5 rounded-full">
              Xentral
            </span>
          </div>
          <p className="text-sm text-gray-500 ml-11">
            Berechne dein persönliches Einsparpotenzial mit Xentral ERP
          </p>
          {partnerSource && (
            <p className="text-xs text-gray-400 ml-11 mt-0.5">
              Partnerempfehlung: <span className="font-medium text-gray-500">{partnerSource}</span>
            </p>
          )}
        </div>

        {/* Two-column layout */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ============ LEFT PANEL: Inputs ============ */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-50 rounded-md flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              Deine Geschäftsdaten
            </h2>

            {/* Monthly Revenue Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-gray-700">
                  Monatlicher Umsatz
                </label>
                <span className="text-sm font-bold text-[#4F46E5] bg-indigo-50 px-2.5 py-1 rounded-lg">
                  {formatNumber(monthlyRevenue)} €
                </span>
              </div>
              <input
                type="range"
                min={SLIDER_MIN}
                max={SLIDER_MAX}
                step={10_000}
                value={monthlyRevenue}
                onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                className="revenue-slider w-full"
                style={{ '--slider-percent': `${sliderPercent}%` } as React.CSSProperties}
              />
              {/* Tick marks */}
              <div className="flex justify-between mt-1">
                {sliderTicks.map((tick) => (
                  <span key={tick} className="text-xs text-gray-400">
                    {formatSliderLabel(tick)}
                  </span>
                ))}
              </div>
            </div>

            {/* Orders per month (read-only) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  ≈ Bestellungen pro Monat
                </label>
                <div className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
                  {formatNumber(Math.round(results.ordersPerMonth))}
                </div>
                <p className="text-xs text-gray-400 mt-1">= Umsatz ÷ AOV</p>
              </div>

              {/* OOS Rate Current */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Out-of-Stock Rate (aktuell)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={oosRateCurrent}
                    onChange={(e) => setOosRateCurrent(Number(e.target.value))}
                    className="roi-input pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Manual time per order */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Zeit pro Bestellung (manuell)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0.5}
                  max={60}
                  step={0.5}
                  value={timePerOrderManual}
                  onChange={(e) => setTimePerOrderManual(Number(e.target.value))}
                  className="roi-input pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
                  Min
                </span>
              </div>
            </div>

            {/* Expert Settings */}
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpertOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Experten-Einstellungen
                </span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${expertOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expertOpen && (
                <div className="p-4 grid grid-cols-2 gap-3">
                  <ExpertField
                    label="Ø Warenkorbwert (AOV)"
                    value={expert.aov}
                    onChange={(v) => handleExpertChange('aov', v)}
                    suffix="€"
                    min={1}
                    step={5}
                  />
                  <ExpertField
                    label="OOS Rate (mit Xentral)"
                    value={expert.oosRateXentral}
                    onChange={(v) => handleExpertChange('oosRateXentral', v)}
                    suffix="%"
                    min={0}
                    max={100}
                    step={0.5}
                  />
                  <ExpertField
                    label="Stundensatz Mitarbeiter"
                    value={expert.hourlyRate}
                    onChange={(v) => handleExpertChange('hourlyRate', v)}
                    suffix="€/h"
                    min={1}
                    step={5}
                  />
                  <ExpertField
                    label="Zeit/Bestellung (Xentral)"
                    value={expert.timePerOrderXentral}
                    onChange={(v) => handleExpertChange('timePerOrderXentral', v)}
                    suffix="Min"
                    min={0.5}
                    step={0.5}
                  />
                  <ExpertField
                    label="Fehlerrate beim Picken"
                    value={expert.pickErrorRate}
                    onChange={(v) => handleExpertChange('pickErrorRate', v)}
                    suffix="%"
                    min={0}
                    max={100}
                    step={0.5}
                  />
                  <ExpertField
                    label="Kosten pro Fehler"
                    value={expert.costPerError}
                    onChange={(v) => handleExpertChange('costPerError', v)}
                    suffix="€"
                    min={0}
                    step={5}
                  />

                  {/* Billing cycle selector */}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Abrechnung</label>
                    <div className="flex gap-1.5">
                      {(Object.keys(BILLING_LABELS) as BillingCycle[]).map((cycle) => (
                        <button
                          key={cycle}
                          type="button"
                          onClick={() => setBillingCycle(cycle)}
                          className={`flex-1 text-xs font-medium py-2 rounded-lg border transition-colors ${
                            billingCycle === cycle
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                          }`}
                        >
                          {BILLING_LABELS[cycle]}
                          {cycle === 'annual' && <span className="ml-1 opacity-70">−5%</span>}
                          {cycle === '2year'  && <span className="ml-1 opacity-70">−10%</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-3 mt-auto pt-2">
              <button
                onClick={() => openModal('consultation')}
                className="flex-1 bg-[#4F46E5] hover:bg-[#3730A3] text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm shadow-sm shadow-indigo-200"
              >
                Beratung buchen
              </button>
              <button
                onClick={() => openModal('offer')}
                className="flex-1 border-2 border-[#4F46E5] text-[#4F46E5] hover:bg-indigo-50 font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
              >
                Angebot anfragen
              </button>
            </div>
          </div>

          {/* ============ RIGHT PANEL: Results ============ */}
          <div className="results-panel flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-160px)] lg:max-h-none">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-green-50 rounded-md flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </span>
              ERP Potential
            </h2>

            {/* Annual Savings Card */}
            <div className="bg-[#F0FFF4] border border-green-100 rounded-2xl p-5">
              <p className="text-sm font-medium text-[#15803D] mb-1">
                Jährliches Einsparpotenzial
              </p>
              <p className="text-4xl font-extrabold text-[#15803D] tracking-tight">
                {formatNumber(Math.round(results.netAnnualSavings))} €
              </p>
              <p className="text-xs text-green-600 mt-1.5">
                Netto-Nutzen nach Abzug der Xentral-Kosten
              </p>
            </div>

            {/* ROI + Time Gain KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <p className="text-xs font-medium text-gray-500 mb-1">ROI im ersten Jahr</p>
                <p className="text-2xl font-extrabold text-[#4F46E5]">
                  {formatPercent(Math.round(results.roiPercent))}
                </p>
                <div className="mt-2 flex items-center justify-center gap-1">
                  <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-green-600 font-medium">Sehr gut</span>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <p className="text-xs font-medium text-gray-500 mb-1">Zeitgewinn/Monat</p>
                <p className="text-2xl font-extrabold text-[#4F46E5]">
                  {formatNumber(Math.round(results.timeGainPerMonth))} Std.
                </p>
                <div className="mt-2 flex items-center justify-center gap-1">
                  <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-green-600 font-medium">Zeitersparnis</span>
                </div>
              </div>
            </div>

            {/* Recommended Plan Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Empfohlener Plan
              </p>

              {results.planRecommendation ? (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-base font-bold text-[#4F46E5]">
                        Xentral {results.planRecommendation.planTierName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Service-Paket:{' '}
                        <span className="font-medium text-gray-600">
                          {results.planRecommendation.servicePackageName}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-extrabold text-gray-900">
                        {formatNumber(Math.round(results.planRecommendation.totalMonthlyFee))} €
                      </p>
                      <p className="text-xs text-gray-400">/ Monat</p>
                    </div>
                  </div>

                  {/* Fee breakdown */}
                  <div className="mt-3 pt-3 border-t border-gray-50 space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Grundgebühr</span>
                      <span>{formatNumber(Math.round(results.planRecommendation.baseMonthlyFee))} €</span>
                    </div>
                    {results.planRecommendation.estimatedOrderCost > 0 && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Est. variable Bestellkosten</span>
                        <span>{formatNumber(Math.round(results.planRecommendation.estimatedOrderCost))} €</span>
                      </div>
                    )}
                  </div>

                  {/* Savings vs monthly billing */}
                  {results.planRecommendation.monthlySavingsVsMonthly > 0 && (
                    <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                      <svg className="w-3.5 h-3.5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs text-green-700 font-medium">
                        Sie sparen{' '}
                        {formatNumber(Math.round(results.planRecommendation.monthlySavingsVsMonthly * 12))} €/Jahr
                        {' '}gegenüber Monatszahlung
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-bold text-[#4F46E5]">{results.plan.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Service-Paket:{' '}
                      <span className="font-medium text-gray-600">{results.plan.servicePackage}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-extrabold text-gray-900">
                      {formatNumber(results.plan.monthlyFee)} €
                    </p>
                    <p className="text-xs text-gray-400">/ Monat</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bar Chart */}
            <SavingsBarChart
              barWithout={results.barWithout}
              barWith={results.barWith}
              monthlySavings={results.barChartMonthlySavings}
            />

            {/* Breakeven Line Chart */}
            <BreakevenChart
              grossMonthlySavings={
                results.timeCostCurrent - results.timeCostXentral +
                results.errorCostCurrent - results.errorCostXentral +
                results.oosSavingsMonthly
              }
              planMonthlyFee={results.plan.monthlyFee}
              breakEvenMonths={results.breakEvenMonths}
            />

            {/* Footer disclaimer */}
            <p className="text-xs text-gray-400 leading-relaxed pb-2">
              * Die Berechnungen basieren auf Durchschnittswerten und Erfahrungen aus über
              2.000 Xentral-Kunden. Individuelle Ergebnisse können variieren.
            </p>
          </div>
        </div>
      </div>

      {/* Lead Capture Modal */}
      <LeadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        intent={modalIntent}
        partnerSource={partnerSource}
        inputs={{
          monthlyRevenue,
          aov: expert.aov,
          oosRateCurrent,
          oosRateXentral: expert.oosRateXentral,
          timePerOrderManual,
          timePerOrderXentral: expert.timePerOrderXentral,
          hourlyRate: expert.hourlyRate,
          pickErrorRate: expert.pickErrorRate,
          costPerError: expert.costPerError,
        }}
        results={results}
      />
    </>
  );
}

// Helper sub-component for expert settings fields
interface ExpertFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
  min?: number;
  max?: number;
  step?: number;
}

function ExpertField({ label, value, onChange, suffix, min = 0, max, step = 1 }: ExpertFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm font-medium text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors pr-10"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none whitespace-nowrap">
          {suffix}
        </span>
      </div>
    </div>
  );
}
