'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatNumber } from '@/lib/calculations';

interface SavingsBarChartProps {
  barWithout: number;
  barWith: number;
  monthlySavings: number;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="font-medium">
            {formatNumber(entry.value)} €
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function SavingsBarChart({
  barWithout,
  barWith,
  monthlySavings,
}: SavingsBarChartProps) {
  const data = [
    {
      name: 'Ohne Xentral',
      value: Math.round(barWithout),
      fill: '#EC4899',
    },
    {
      name: 'Mit Xentral',
      value: Math.round(barWith),
      fill: '#22C55E',
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-900 text-sm mb-0.5">
        Sparpotential dank Automatisierung
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        Kosteneinsparung pro Monat:{' '}
        <span className="font-semibold text-gray-700">
          {formatNumber(Math.round(monthlySavings))} €
        </span>
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          barCategoryGap="40%"
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 500 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            tickFormatter={(v) => `${formatNumber(v)} €`}
            width={75}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={80}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 justify-center mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#EC4899]" />
          <span className="text-xs text-gray-500">Ohne Xentral</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#22C55E]" />
          <span className="text-xs text-gray-500">Mit Xentral</span>
        </div>
      </div>
    </div>
  );
}
