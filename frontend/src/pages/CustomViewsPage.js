import React, { useEffect, useState } from 'react';
import DupeClusterGraph from '../components/DupeClusterGraph';
import MergeConfidence from '../components/MergeConfidence';
import MergeApprovalQueue from '../components/MergeApprovalQueue';
import DedupeRulesEditor from '../components/DedupeRulesEditor';

export default function CustomViewsPage() {
  const [graph, setGraph] = useState(null);
  const [conf, setConf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const [g, c] = await Promise.all([
        fetch('/api/custom-views/cluster-graph', { headers }).then((r) => r.json()),
        fetch('/api/custom-views/merge-confidence', { headers }).then((r) => r.json()),
      ]);
      setGraph(g);
      setConf(c);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dedupe Analytics</h2>
          <p>Bespoke cluster topology and merge confidence insights for the deduplication queue.</p>
        </div>
        <button className="btn btn-secondary" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {err && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          Failed to load: {err}
        </div>
      )}

      <section style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Duplicate Cluster Graph</h3>
          <span style={{ color: '#64748b', fontSize: 13 }}>
            {graph?.nodes?.length || 0} records · {graph?.edges?.length || 0} similarity links · {graph?.clusters?.length || 0} clusters
          </span>
        </div>
        <DupeClusterGraph data={graph} />
        <p style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>
          Nodes represent product records grouped by cluster (brand). Edge thickness/color encodes similarity score (Jaccard on name tokens). Red ≥0.6, amber ≥0.4, gray below.
        </p>
      </section>

      <section>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Merge Confidence Distribution</h3>
          <span style={{ color: '#64748b', fontSize: 13 }}>
            {conf?.total_candidates || 0} candidate pairs
          </span>
        </div>
        <MergeConfidence data={conf} />
      </section>

      <section style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Merge Approval Queue</h3>
          <span style={{ color: '#64748b', fontSize: 13 }}>
            Approve, reject, or skip candidate merge pairs with an optional reason.
          </span>
        </div>
        <MergeApprovalQueue />
      </section>

      <section style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Dedupe Rules Editor</h3>
          <span style={{ color: '#64748b', fontSize: 13 }}>
            Manage exact / fuzzy / regex deduplication rules with per-rule preview.
          </span>
        </div>
        <DedupeRulesEditor />
      </section>
    </div>
  );
}
