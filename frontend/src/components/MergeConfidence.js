import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  Cell, Legend, LabelList,
} from 'recharts';

const bucketColors = {
  '0-25': '#94a3b8',
  '25-50': '#fbbf24',
  '50-75': '#0ea5e9',
  '75-100': '#10b981',
};

export default function MergeConfidence({ data }) {
  if (!data || !data.buckets) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
        No confidence data yet.
      </div>
    );
  }

  const chartData = data.buckets.map((b) => ({
    range: b.range,
    label: b.label,
    count: b.count,
  }));

  return (
    <div>
      <div style={{
        display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap',
      }}>
        <Stat label="Total Candidates" value={data.total_candidates} color="#6366f1" />
        <Stat label="High Confidence (75-100)" value={data.buckets.find(b => b.range === '75-100')?.count || 0} color="#10b981" />
        <Stat label="Medium (50-75)" value={data.buckets.find(b => b.range === '50-75')?.count || 0} color="#0ea5e9" />
        <Stat label="Low (<50)" value={(data.buckets.find(b => b.range === '0-25')?.count || 0) + (data.buckets.find(b => b.range === '25-50')?.count || 0)} color="#94a3b8" />
      </div>

      <div style={{ width: '100%', height: 340, background: '#fff', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 24, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="range" tick={{ fill: '#475569', fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: 'rgba(99,102,241,0.08)' }}
              formatter={(v, _n, item) => [`${v} candidates`, item?.payload?.label || 'Confidence']}
              labelFormatter={(l) => `Confidence ${l}`}
            />
            <Legend />
            <Bar dataKey="count" name="Merge Candidates" radius={[8, 8, 0, 0]}>
              <LabelList dataKey="count" position="top" fill="#1e293b" fontSize={12} fontWeight={600} />
              {chartData.map((entry) => (
                <Cell key={entry.range} fill={bucketColors[entry.range] || '#6366f1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {data.top_candidates?.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ margin: '0 0 10px', color: '#1e293b' }}>Top Merge Candidates</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {data.top_candidates.map((c, i) => (
              <div key={i} style={{
                background: '#fff', padding: 10, border: '1px solid #e2e8f0', borderRadius: 10,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 99,
                    background: c.confidence >= 75 ? '#dcfce7' : c.confidence >= 50 ? '#dbeafe' : '#fef3c7',
                    color: c.confidence >= 75 ? '#166534' : c.confidence >= 50 ? '#1e40af' : '#92400e',
                    fontWeight: 600,
                  }}>
                    {c.confidence}% confidence
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{c.brand}</span>
                </div>
                <div style={{ fontSize: 12, color: '#1e293b', marginBottom: 2 }}>{c.a}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>↕ {c.b}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{
      flex: '1 1 160px', minWidth: 160, padding: '12px 14px',
      borderRadius: 10, border: `1px solid ${color}33`, background: `${color}10`,
    }}>
      <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
