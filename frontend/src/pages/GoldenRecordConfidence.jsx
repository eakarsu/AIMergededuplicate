import React, { useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function GoldenRecordConfidence() {
  const [json, setJson] = useState('[{"name":"Acme Cable","sku":"AC-1","brand":"Acme","price":"12.99"},{"name":"Acme Cable","sku":"AC-1","brand":"ACME","price":"12.99"},{"name":"Acme Cable 1m","sku":"AC-1","brand":"Acme","price":"13.49"}]');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const score = async () => {
    setError('');
    try {
      const candidates = JSON.parse(json);
      const res = await fetch(`${API}/golden-record-confidence/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates }),
      });
      setResult(await res.json());
    } catch (err) {
      setError(err.message || 'Unable to score records');
    }
  };

  return (
    <div className="page">
      <h1>Golden Record Confidence</h1>
      <p>Score whether duplicate candidates are safe to merge into a trusted product record.</p>
      <textarea value={json} onChange={(e) => setJson(e.target.value)} style={{ width: '100%', minHeight: 180, marginTop: 16 }} />
      <button onClick={score} style={{ marginTop: 12 }}>Score candidate set</button>
      {error && <div style={{ color: 'crimson', marginTop: 12 }}>{error}</div>}
      {result && (
        <section className="card" style={{ marginTop: 20 }}>
          <h2>{result.confidence}% - {result.confidenceBand}</h2>
          <p>Completeness: {result.completeness}%</p>
          <pre>{JSON.stringify(result.fieldVotes, null, 2)}</pre>
        </section>
      )}
    </div>
  );
}
