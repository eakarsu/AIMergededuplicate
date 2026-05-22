import React, { useEffect, useState } from 'react';

const headers = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export default function MergeApprovalQueue() {
  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [reasonByPair, setReasonByPair] = useState({});
  const [busyPair, setBusyPair] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch('/api/custom-views/merge-queue', { headers: headers() });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
      setQueue(json);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (pair_id, decision) => {
    setBusyPair(pair_id + decision);
    setErr(null);
    try {
      const reason = reasonByPair[pair_id] || '';
      const r = await fetch('/api/custom-views/merge-decision', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ pair_id, decision, reason }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
      setLastResult(json);
      setReasonByPair((m) => ({ ...m, [pair_id]: '' }));
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyPair(null);
    }
  };

  if (loading && !queue) {
    return <div style={{ padding: 24, color: '#64748b' }}>Loading merge approval queue…</div>;
  }
  if (err && !queue) {
    return (
      <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8 }}>
        Failed to load queue: {err}
      </div>
    );
  }

  const pending = queue?.pending || [];
  const decided = queue?.decided || [];

  return (
    <div data-testid="merge-approval-queue" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            <strong style={{ color: '#0f172a' }}>{queue?.pending_count ?? 0}</strong> pending ·{' '}
            <strong style={{ color: '#0f172a' }}>{queue?.decided_count ?? 0}</strong> decided ·{' '}
            <strong style={{ color: '#0f172a' }}>{queue?.total ?? 0}</strong> total candidate pairs
          </div>
          {lastResult && (
            <div style={{ fontSize: 12, color: '#0f766e', marginTop: 4 }}>
              Last decision: <strong>{lastResult.decision}</strong> on {lastResult.pair_id} · remaining {lastResult.remaining}
            </div>
          )}
        </div>
        <button className="btn btn-secondary" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {err && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: 8, borderRadius: 6, marginBottom: 10, fontSize: 13 }}>
          {err}
        </div>
      )}

      {pending.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 8 }}>
          No pending candidate pairs. All decisions made.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {pending.slice(0, 12).map((p) => (
            <div key={p.pair_id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  <code>{p.pair_id}</code> · brand <strong>{p.brand}</strong>
                </div>
                <div style={{
                  padding: '2px 8px',
                  background: p.confidence >= 75 ? '#dcfce7' : p.confidence >= 50 ? '#fef3c7' : '#fee2e2',
                  color: p.confidence >= 75 ? '#166534' : p.confidence >= 50 ? '#92400e' : '#991b1b',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  {p.confidence}% confidence
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div style={{ background: '#fff', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Product A · {p.product_a_sku}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{p.product_a_name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>${Number(p.product_a_price).toFixed(2)}</div>
                </div>
                <div style={{ background: '#fff', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Product B · {p.product_b_sku}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{p.product_b_name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>${Number(p.product_b_price).toFixed(2)}</div>
                </div>
              </div>
              <input
                type="text"
                placeholder="Optional reason (e.g. 'same SKU different vendor')"
                value={reasonByPair[p.pair_id] || ''}
                onChange={(e) => setReasonByPair((m) => ({ ...m, [p.pair_id]: e.target.value }))}
                style={{
                  width: '100%', padding: '6px 8px', fontSize: 13, borderRadius: 6,
                  border: '1px solid #cbd5e1', marginBottom: 8,
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => submit(p.pair_id, 'approve')}
                  disabled={busyPair === p.pair_id + 'approve'}
                  style={{
                    flex: 1, padding: '6px 10px', background: '#10b981', color: '#fff',
                    border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                    opacity: busyPair === p.pair_id + 'approve' ? 0.6 : 1,
                  }}
                >
                  Approve
                </button>
                <button
                  onClick={() => submit(p.pair_id, 'reject')}
                  disabled={busyPair === p.pair_id + 'reject'}
                  style={{
                    flex: 1, padding: '6px 10px', background: '#ef4444', color: '#fff',
                    border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                    opacity: busyPair === p.pair_id + 'reject' ? 0.6 : 1,
                  }}
                >
                  Reject
                </button>
                <button
                  onClick={() => submit(p.pair_id, 'skip')}
                  disabled={busyPair === p.pair_id + 'skip'}
                  style={{
                    flex: 1, padding: '6px 10px', background: '#64748b', color: '#fff',
                    border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                    opacity: busyPair === p.pair_id + 'skip' ? 0.6 : 1,
                  }}
                >
                  Skip
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {decided.length > 0 && (
        <details style={{ marginTop: 16 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#0f172a' }}>
            Decision history ({decided.length})
          </summary>
          <div style={{ marginTop: 8, maxHeight: 240, overflowY: 'auto' }}>
            {decided.map((d) => (
              <div key={d.pair_id} style={{ padding: 8, borderBottom: '1px solid #e2e8f0', fontSize: 12 }}>
                <strong style={{
                  color: d.decision === 'approve' ? '#166534' : d.decision === 'reject' ? '#991b1b' : '#475569',
                }}>{d.decision.toUpperCase()}</strong>
                {' '}· <code>{d.pair_id}</code>
                {d.product_a_name && (
                  <span style={{ color: '#64748b' }}> · {d.product_a_name} ⇄ {d.product_b_name}</span>
                )}
                {d.reason && <div style={{ color: '#475569', marginTop: 2 }}>“{d.reason}”</div>}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
