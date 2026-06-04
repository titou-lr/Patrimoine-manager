import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts'
import { formatEur } from '../../utils/format'

interface ChartPoint {
  age: number
  acc?: number
  withdraw?: number
}

interface Props {
  accumulationData: Array<{ age: number; capital: number }>
  withdrawalData: Array<{ age: number; capital: number }>
  capitalNeeded: number
  ageRetirement: number
}

function formatK(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M€`
  if (v >= 1_000) return `${Math.round(v / 1_000)} k€`
  return `${Math.round(v)} €`
}

export default function RetirementDualChart({
  accumulationData,
  withdrawalData,
  capitalNeeded,
  ageRetirement,
}: Props) {
  const merged: ChartPoint[] = []

  for (const pt of accumulationData) {
    if (pt.age < ageRetirement) {
      merged.push({ age: pt.age, acc: pt.capital })
    } else {
      merged.push({ age: pt.age, acc: pt.capital, withdraw: pt.capital })
    }
  }
  for (const pt of withdrawalData) {
    if (pt.age > ageRetirement) {
      merged.push({ age: pt.age, withdraw: Math.max(0, pt.capital) })
    }
  }

  const maxAge = withdrawalData.at(-1)?.age ?? ageRetirement

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={merged} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="retGradAcc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="retGradWithdraw" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#0EA5E9" stopOpacity={0.45} />
            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke="#262931" strokeDasharray="1 0" vertical={false} />

        <XAxis
          dataKey="age"
          type="number"
          domain={['dataMin', maxAge]}
          tickCount={8}
          tick={{ fill: '#6B7280', fontSize: 10 }}
          tickFormatter={(v) => `${v} ans`}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#6B7280', fontSize: 10 }}
          tickFormatter={formatK}
          width={70}
          axisLine={false}
          tickLine={false}
        />

        <Tooltip
          contentStyle={{
            background: '#23252B',
            border: '1px solid #3A3E48',
            borderRadius: 12,
            fontSize: 11,
            fontFamily: "'Geist Mono', monospace",
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
          labelStyle={{ color: '#6B7280', marginBottom: 4 }}
          labelFormatter={(v) => `Âge : ${v} ans`}
          formatter={(value, name) => [
            formatEur(value as number),
            name === 'acc' ? 'Accumulation' : 'Retrait',
          ]}
        />

        <ReferenceArea
          x1={ageRetirement}
          x2={maxAge}
          fill="rgba(37, 99, 235, 0.03)"
          strokeOpacity={0}
        />

        {capitalNeeded > 0 && (
          <ReferenceLine
            y={capitalNeeded}
            stroke="#2563EB"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{
              value: 'Objectif',
              position: 'insideTopRight',
              fill: '#2563EB',
              fontSize: 9,
            }}
          />
        )}

        <ReferenceLine
          x={ageRetirement}
          stroke="#3A3E48"
          strokeWidth={1}
          label={{
            value: `Retraite à ${ageRetirement} ans`,
            position: 'insideTopLeft',
            fill: '#6B7280',
            fontSize: 9,
          }}
        />

        <Area
          type="monotone"
          dataKey="acc"
          stroke="#2563EB"
          strokeWidth={2}
          fill="url(#retGradAcc)"
          dot={false}
          connectNulls={false}
          name="acc"
        />
        <Area
          type="monotone"
          dataKey="withdraw"
          stroke="#0EA5E9"
          strokeWidth={2}
          fill="url(#retGradWithdraw)"
          dot={false}
          connectNulls={false}
          name="withdraw"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
