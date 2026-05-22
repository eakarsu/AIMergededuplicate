import express from 'express';

const router = express.Router();

router.post('/score', (req, res) => {
  const { candidates = [], requiredFields = ['name', 'sku', 'brand', 'price'] } = req.body || {};
  const rows = Array.isArray(candidates) ? candidates : [];
  const fieldVotes = {};
  requiredFields.forEach((field) => {
    const counts = {};
    rows.forEach((row) => {
      const value = String(row[field] || '').trim().toLowerCase();
      if (value) counts[value] = (counts[value] || 0) + 1;
    });
    const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    fieldVotes[field] = {
      value: winner ? winner[0] : null,
      agreement: rows.length ? Math.round(((winner?.[1] || 0) / rows.length) * 100) : 0,
    };
  });
  const completeness = rows.length ? Math.round(rows.reduce((sum, row) => sum + requiredFields.filter((field) => row[field]).length / requiredFields.length, 0) / rows.length * 100) : 0;
  const agreement = Math.round(Object.values(fieldVotes).reduce((sum, vote) => sum + vote.agreement, 0) / Math.max(1, requiredFields.length));
  const confidence = Math.round((agreement * 0.7) + (completeness * 0.3));

  res.json({
    feature: 'Golden Record Confidence',
    confidence,
    confidenceBand: confidence >= 85 ? 'auto-merge ready' : confidence >= 65 ? 'review required' : 'manual steward review',
    fieldVotes,
    completeness,
    recommendedWorkflow: confidence >= 85 ? 'merge with audit snapshot' : 'route to data steward queue',
  });
});

export default router;
