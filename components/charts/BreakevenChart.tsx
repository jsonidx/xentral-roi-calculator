'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatNumber, breakEvenToMonthsDays, generateBreakevenData } from '@/lib/calculations';

interface BreakevenChartProps {
  grossMonthlySavings: number;
  planMonthlyFee: number;
  breakEvenMonths: number;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string; dataKey: string }>;
  label?: number;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-700 mb-1">Monat {label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="font-medium">
            {entry.dataKey === 'savings' ? 'Einsparung' : 'Xentral-Kosten'}:{' '}
            {formatNumber(entry.value)} €
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function BreakevenChart({
  grossMonthlySavings,
  planMonthlyFee,
  breakEvenMonths,
}: BreakevenChartProps) {
  const data = generateBreakevenData(grossMonthlySavings, planMonthlyFee, 12);
  const { months, days } = breakEvenToMonthsDays(breakEvenMonths);

  // Find breakeven x value for reference line
  const breakevenX = Math.min(breakEvenMonths, 12);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-900 text-sm mb-4">
        Break-even: Einsparung vs. Xentral Invest
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            tickFormatter={(v) => `M${v}`}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            tickFormatter={(v) => `${formatNumber(v)} €`}
            width={75}
          />
          <Tooltip content={<CustomTooltip />} />
          {breakevenX > 0 && breakevenX <= 12 && (
            <ReferenceLine
              x={Math.round(breakevenX)}
              stroke="#9CA3AF"
              strokeDasharray="4 4"
              label={{
                value: 'Break-even',
                position: 'insideTopRight',
                fontSize: 10,
                fill: '#9CA3AF',
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="savings"
            stroke="#EC4899"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: '#EC4899' }}
            name="Kumulierte Einsparung"
          />
          <Line
            type="monotone"
            dataKey="costs"
            stroke="#22C55E"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: '#22C55E' }}
            name="Kumulierte Xentral-Kosten"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 justify-center mt-2 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-[#EC4899]" />
          <span className="text-xs text-gray-500">Kumulierte Einsparung</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-[#22C55E]" />
          <span className="text-xs text-gray-500">Kumulierte Xentral-Kosten</span>
        </div>
      </div>
      <div className="text-center bg-gray-50 rounded-lg py-2 px-3">
        <span className="text-xs text-gray-600">
          Break-even nach:{' '}
          <span className="font-semibold text-gray-800">
            {months} Monate{days > 0 ? `, ${days} Tage` : ''}
          </span>
        </span>
      </div>
    </div>
  );
}
