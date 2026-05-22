import React, { useEffect, useState } from 'react';

const headers = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const FIELDS = ['sku', 'name', 'brand', 'barcode', 'description'];
const OPS = ['exact', 'fuzzy', 'regex'];

const emptyDraft = () => ({ field: 'name', op: 'fuzzy', pattern: '', weight: 50, enabled: true });

export default function DedupeRulesEditor() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({});
  const [preview, setPreview] = useState({}); // by rule id
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch('/api/custom-views/dedupe-rules', { headers: headers() });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
      setRules(json.rules || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createRule = async () => {
    setBusy(true);
    setErr(null);
    try {
      const body = { ...draft, weight: Number(draft.weight) };
      const r = await fetch('/api/custom-views/dedupe-rules', {
        method: 'POST', headers: headers(), body: JSON.stringify(body),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
      setDraft(emptyDraft());
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const beginEdit = (rule) => {
    setEditingId(rule.id);
    setEdit({
      field: rule.field, op: rule.op, pattern: rule.pattern || '',
      weight: rule.weight, enabled: rule.enabled,
    });
  };
  const cancelEdit = () => { setEditingId(null); setEdit({}); };

  const saveEdit = async (id) => {
    setBusy(true);
    setErr(null);
    try {
      const body = { ...edit, weight: Number(edit.weight) };
      const r = await fetch(`/api/custom-views/dedupe-rules/${id}`, {
        method: 'PUT', headers: headers(), body: JSON.stringify(body),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
      cancelEdit();
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleEnabled = async (rule) => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/custom-views/dedupe-rules/${rule.id}`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteRule = async (id) => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/custom-views/dedupe-rules/${id}`, {
        method: 'DELETE', headers: headers(),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const runPreview = async (id) => {
    setPreview((p) => ({ ...p, [id]: { loading: true } }));
    try {
      const r = await fetch(`/api/custom-views/dedupe-rules/${id}/preview`, { headers: headers() });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
      setPreview((p) => ({ ...p, [id]: { ...json, loading: false } }));
    } catch (e) {
      setPreview((p) => ({ ...p, [id]: { error: e.message, loading: false } }));
    }
  };

  return (
    <div data-testid="dedupe-rules-editor" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: '#64748b' }}>
          <strong style={{ color: '#0f172a' }}>{rules.length}</strong> rule(s) ·{' '}
          <strong style={{ color: '#0f172a' }}>{rules.filter((r) => r.enabled).length}</strong> enabled
        </div>
        <button className="btn btn-secondary" onClick={load} disabled={loading || busy}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {err && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: 8, borderRadius: 6, marginBottom: 10, fontSize: 13 }}>
          {err}
        </div>
      )}

      {/* New rule form */}
      <div style={{ background: '#f1f5f9', padding: 12, borderRadius: 8, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#0f172a' }}>Add a new rule</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', gap: 8, alignItems: 'center' }}>
          <select value={draft.field} onChange={(e) => setDraft({ ...draft, field: e.target.value })}
                  style={inputStyle}>
            {FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={draft.op} onChange={(e) => setDraft({ ...draft, op: e.target.value })}
                  style={inputStyle}>
            {OPS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <input type="text" placeholder="regex pattern" value={draft.pattern}
                 onChange={(e) => setDraft({ ...draft, pattern: e.target.value })}
                 disabled={draft.op !== 'regex'}
                 style={{ ...inputStyle, opacity: draft.op === 'regex' ? 1 : 0.5 }} />
          <input type="number" min={0} max={100} value={draft.weight}
                 onChange={(e) => setDraft({ ...draft, weight: e.target.value })}
                 style={inputStyle} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={draft.enabled}
                   onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
            enabled
          </label>
          <button onClick={createRule} disabled={busy}
                  style={{
                    padding: '6px 12px', background: '#6366f1', color: '#fff',
                    border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                    opacity: busy ? 0.6 : 1,
                  }}>Add</button>
        </div>
      </div>

      {/* Rules table */}
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '60px 110px 100px 1fr 80px 80px 240px',
          gap: 8, padding: '0 8px', fontSize: 12, color: '#64748b', fontWeight: 600,
        }}>
          <div>ID</div><div>Field</div><div>Op</div><div>Pattern</div>
          <div>Weight</div><div>Enabled</div><div>Actions</div>
        </div>
        {rules.map((rule) => {
          const isEditing = editingId === rule.id;
          const pv = preview[rule.id];
          return (
            <div key={rule.id} style={{
              background: rule.enabled ? '#fff' : '#f8fafc',
              border: '1px solid #e2e8f0', borderRadius: 8, padding: 8,
            }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '60px 110px 100px 1fr 80px 80px 240px',
                gap: 8, alignItems: 'center', fontSize: 13,
              }}>
                <div style={{ color: '#64748b' }}>#{rule.id}</div>
                {isEditing ? (
                  <>
                    <select value={edit.field} onChange={(e) => setEdit({ ...edit, field: e.target.value })} style={inputStyle}>
                      {FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select value={edit.op} onChange={(e) => setEdit({ ...edit, op: e.target.value })} style={inputStyle}>
                      {OPS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <input value={edit.pattern || ''} onChange={(e) => setEdit({ ...edit, pattern: e.target.value })}
                           disabled={edit.op !== 'regex'} style={inputStyle} />
                    <input type="number" min={0} max={100} value={edit.weight}
                           onChange={(e) => setEdit({ ...edit, weight: e.target.value })} style={inputStyle} />
                    <label style={{ fontSize: 12 }}>
                      <input type="checkbox" checked={!!edit.enabled}
                             onChange={(e) => setEdit({ ...edit, enabled: e.target.checked })} />
                    </label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => saveEdit(rule.id)} disabled={busy} style={btnPrimary}>Save</button>
                      <button onClick={cancelEdit} style={btnSecondary}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>{rule.field}</div>
                    <div>
                      <span style={{
                        padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: rule.op === 'exact' ? '#dbeafe' : rule.op === 'fuzzy' ? '#fef3c7' : '#fce7f3',
                        color: rule.op === 'exact' ? '#1e40af' : rule.op === 'fuzzy' ? '#92400e' : '#9d174d',
                      }}>{rule.op}</span>
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#475569', wordBreak: 'break-all' }}>
                      {rule.pattern || <em style={{ color: '#cbd5e1' }}>none</em>}
                    </div>
                    <div style={{ fontWeight: 600 }}>{rule.weight}</div>
                    <div>
                      <button onClick={() => toggleEnabled(rule)} disabled={busy}
                              style={{
                                padding: '2px 8px', borderRadius: 4, border: 'none', cursor: 'pointer',
                                background: rule.enabled ? '#10b981' : '#94a3b8', color: '#fff', fontSize: 11,
                              }}>
                        {rule.enabled ? 'on' : 'off'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button onClick={() => runPreview(rule.id)} style={btnSecondary}>Preview</button>
                      <button onClick={() => beginEdit(rule)} style={btnSecondary}>Edit</button>
                      <button onClick={() => deleteRule(rule.id)} disabled={busy} style={btnDanger}>Delete</button>
                    </div>
                  </>
                )}
              </div>
              {pv && (
                <div style={{ marginTop: 6, padding: 8, background: '#f8fafc', borderRadius: 6, fontSize: 12 }}>
                  {pv.loading ? (
                    <span style={{ color: '#64748b' }}>Running preview…</span>
                  ) : pv.error ? (
                    <span style={{ color: '#991b1b' }}>Preview error: {pv.error}</span>
                  ) : (
                    <span style={{ color: '#0f172a' }}>
                      <strong>{pv.matches}</strong> match(es) across {pv.scanned} active products
                      {pv.sample && pv.sample.length > 0 && (
                        <span style={{ color: '#64748b' }}> · e.g. {pv.sample.slice(0, 2).map((s) => Array.isArray(s) ? s.join(' ⇄ ') : s).join('; ')}</span>
                      )}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inputStyle = {
  padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, width: '100%',
};
const btnPrimary = {
  padding: '4px 10px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600,
};
const btnSecondary = {
  padding: '4px 10px', background: '#e2e8f0', color: '#0f172a', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600,
};
const btnDanger = {
  padding: '4px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600,
};
