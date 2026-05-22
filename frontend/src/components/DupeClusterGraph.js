import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';

// Color palette per cluster
const clusterColors = [
  '#6366f1', '#ec4899', '#10b981', '#f59e0b',
  '#0ea5e9', '#8b5cf6', '#14b8a6', '#f97316',
];

export default function DupeClusterGraph({ data }) {
  const { nodes, edges } = useMemo(() => {
    if (!data || !data.nodes) return { nodes: [], edges: [] };

    const clusterIndex = {};
    (data.clusters || []).forEach((c, i) => { clusterIndex[c.id] = i; });

    const rfNodes = data.nodes.map((n) => {
      const colorIdx = clusterIndex[n.clusterId] ?? 0;
      const bg = clusterColors[colorIdx % clusterColors.length];
      return {
        id: n.id,
        position: { x: n.x, y: n.y },
        data: {
          label: (
            <div style={{ textAlign: 'center', fontSize: 11, lineHeight: 1.25, padding: '2px 4px' }}>
              <div style={{ fontWeight: 600 }}>{n.label}</div>
              <div style={{ opacity: 0.8, fontSize: 10 }}>{n.sku}</div>
              <div style={{ opacity: 0.8, fontSize: 10 }}>${n.price?.toFixed?.(2)}</div>
            </div>
          ),
        },
        style: {
          background: bg,
          color: '#fff',
          border: `2px solid ${bg}`,
          borderRadius: 10,
          width: 170,
          padding: 4,
          boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
        },
      };
    });

    const rfEdges = (data.edges || []).map((e) => {
      const stroke = e.weight >= 0.6 ? '#ef4444' : e.weight >= 0.4 ? '#f59e0b' : '#94a3b8';
      const width = 1 + e.weight * 4;
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        animated: e.weight >= 0.5,
        label: e.weight.toFixed(2),
        labelStyle: { fill: '#0f172a', fontWeight: 600, fontSize: 10 },
        labelBgStyle: { fill: '#fff', opacity: 0.9 },
        style: { stroke, strokeWidth: width },
      };
    });

    return { nodes: rfNodes, edges: rfEdges };
  }, [data]);

  if (!data || nodes.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
        No cluster data yet.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 620, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        minZoom={0.25}
        maxZoom={1.5}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
      >
        <Background color="#cbd5e1" gap={20} />
        <MiniMap pannable zoomable nodeColor={(n) => n.style?.background || '#888'} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
