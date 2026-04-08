'use client';

import type { GrowthParams } from '@/types';

interface GrowthRadarProps {
  params: GrowthParams;
  size?: number;
}

const LABELS: { key: keyof GrowthParams; label: string }[] = [
  { key: 'curiosity', label: '好奇心' },
  { key: 'empathy', label: '共感' },
  { key: 'logic', label: '論理性' },
  { key: 'caution', label: '慎重さ' },
  { key: 'attachment', label: '親密度' },
];

/**
 * 5角形のレーダーチャート（SVG）
 */
export function GrowthRadar({ params, size = 240 }: GrowthRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const n = LABELS.length;

  // 各頂点の角度（上が0）
  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    return {
      x: cx + r * value * Math.cos(angle),
      y: cy + r * value * Math.sin(angle),
    };
  };

  // 背景グリッド
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPaths = gridLevels.map((level) => {
    const points = LABELS.map((_, i) => getPoint(i, level));
    return points.map((p) => `${p.x},${p.y}`).join(' ');
  });

  // データポリゴン
  const dataPoints = LABELS.map((l, i) => getPoint(i, params[l.key]));
  const dataPath = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // 軸ライン
  const axisPoints = LABELS.map((_, i) => getPoint(i, 1.0));

  // ラベル位置
  const labelPoints = LABELS.map((_, i) => getPoint(i, 1.22));

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto"
    >
      {/* グリッド */}
      {gridPaths.map((points, i) => (
        <polygon
          key={i}
          points={points}
          fill="none"
          stroke="var(--border)"
          strokeWidth="1"
          opacity={0.6}
        />
      ))}

      {/* 軸 */}
      {axisPoints.map((p, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={p.x}
          y2={p.y}
          stroke="var(--border)"
          strokeWidth="1"
          opacity={0.4}
        />
      ))}

      {/* データ */}
      <polygon
        points={dataPath}
        fill="var(--primary)"
        fillOpacity={0.2}
        stroke="var(--primary)"
        strokeWidth="2"
      />

      {/* データ点 */}
      {dataPoints.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="4"
          fill="var(--primary)"
        />
      ))}

      {/* ラベル */}
      {labelPoints.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={p.y}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-muted text-[11px]"
        >
          {LABELS[i].label}
        </text>
      ))}
    </svg>
  );
}
