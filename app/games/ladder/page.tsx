"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

// Rung type representing a ladder rung connecting column indices
type Rung = { row: number; col: number };

// Generate ladder rungs with a density and avoiding adjacent overlaps
function generateLadder(cols: number, rows: number, density = 0.28): Rung[] {
  const rungs: Rung[] = [];
  if (cols <= 1) return rungs;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const leftTaken = rungs.some((x) => x.row === r && x.col === c - 1);
      if (leftTaken) continue;
      if (Math.random() < density) {
        rungs.push({ row: r, col: c });
      }
    }
  }
  return rungs;
}

// Walk down a ladder from a starting column, returning the ending column
function walkLadder(startCol: number, cols: number, rows: number, rungs: Rung[]) {
  let c = startCol;
  for (let r = 0; r < rows; r++) {
    const right = rungs.find((x) => x.row === r && x.col === c);
    if (right) {
      c = c + 1;
      continue;
    }
    const left = rungs.find((x) => x.row === r && x.col === c - 1);
    if (left) {
      c = c - 1;
      continue;
    }
  }
  return c;
}

// Ladder SVG visualization component
function LadderSVG({
  names,
  results,
  rows,
  rungs,
  activeCol,
  highlightPaths = false,
}: {
  names: string[];
  results: string[];
  rows: number;
  rungs: Rung[];
  activeCol: number | null;
  highlightPaths?: boolean;
}) {
  const cols = names.length;
  const width = 800;
  const height = 520;
  const paddingX = 100;
  const paddingTop = 60;
  const paddingBottom = 60;

  const lineX = (colIdx: number) =>
    paddingX + (colIdx * (width - paddingX * 2)) / (cols - 1 || 1);
  const lineY = (rowIdx: number) =>
    paddingTop + (rowIdx * (height - paddingTop - paddingBottom)) / (rows - 1 || 1);

  const pathPoints: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  if (highlightPaths && activeCol != null) {
    let c = activeCol;
    for (let r = 0; r < rows; r++) {
      // vertical segment
      pathPoints.push({
        x1: lineX(c),
        y1: r === 0 ? paddingTop : lineY(r - 1),
        x2: lineX(c),
        y2: lineY(r),
      });
      // horizontal segment to right or left
      const right = rungs.find((x) => x.row === r && x.col === c);
      const left = rungs.find((x) => x.row === r && x.col === c - 1);
      if (right) {
        pathPoints.push({
          x1: lineX(c),
          y1: lineY(r),
          x2: lineX(c + 1),
          y2: lineY(r),
        });
        c = c + 1;
      } else if (left) {
        pathPoints.push({
          x1: lineX(c),
          y1: lineY(r),
          x2: lineX(c - 1),
          y2: lineY(r),
        });
        c = c - 1;
      }
    }
    // final vertical drop
    pathPoints.push({
      x1: lineX(c),
      y1: lineY(rows - 1),
      x2: lineX(c),
      y2: height - paddingBottom,
    });
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full rounded-2xl border shadow-sm">
      {/* vertical lines */}
      {Array.from({ length: cols }).map((_, c) => (
        <line
          key={`v-${c}`}
          x1={lineX(c)}
          y1={paddingTop}
          x2={lineX(c)}
          y2={height - paddingBottom}
          stroke="#d1d5db"
          strokeWidth={2}
        />
      ))}
      {/* horizontal rungs */}
      {rungs.map((r, idx) => (
        <line
          key={`h-${idx}`}
          x1={lineX(r.col)}
          y1={lineY(r.row)}
          x2={lineX(r.col + 1)}
          y2={lineY(r.row)}
          stroke="#9ca3af"
          strokeWidth={3}
        />
      ))}
      {/* top labels */}
      {names.map((n, c) => (
        <text
          key={`name-${c}`}
          x={lineX(c)}
          y={paddingTop - 20}
          textAnchor="middle"
          className="fill-gray-800"
          style={{ fontSize: 14, fontWeight: 700 }}
        >
          {n || `P${c + 1}`}
        </text>
      ))}
      {/* bottom labels */}
      {results.map((n, c) => (
        <text
          key={`res-${c}`}
          x={lineX(c)}
          y={height - paddingBottom + 24}
          textAnchor="middle"
          className="fill-gray-700"
          style={{ fontSize: 13, fontWeight: 600 }}
        >
          {n || `R${c + 1}`}
        </text>
      ))}
      {/* highlighted path */}
      {highlightPaths &&
        pathPoints.map((p, i) => (
          <line
            key={`path-${i}`}
            x1={p.x1}
            y1={p.y1}
            x2={p.x2}
            y2={p.y2}
            stroke="#111827"
            strokeWidth={4}
            strokeLinecap="round"
            opacity={0.9}
          />
        ))}
    </svg>
  );
}

// Main Ladder page component
export default function LadderPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [count, setCount] = useState(4);
  const [names, setNames] = useState<string[]>(() => Array(4).fill(""));
  const [results, setResults] = useState<string[]>(() => Array(4).fill(""));
  const [rows, setRows] = useState(18);
  const [density, setDensity] = useState(0.28);
  const [rungs, setRungs] = useState<Rung[]>([]);
  const [mapping, setMapping] = useState<number[] | null>(null);
  const [activeCol, setActiveCol] = useState<number | null>(null);

  const canStart =
    names.filter((x) => x.trim().length > 0).length === count &&
    results.filter((x) => x.trim().length > 0).length === count;

  const onBuild = () => {
    const ladder = generateLadder(count, rows, density);
    setRungs(ladder);
    const m: number[] = [];
    for (let c = 0; c < count; c++) {
      m.push(walkLadder(c, count, rows, ladder));
    }
    setMapping(m);
    setStep(3);
  };

  const restart = () => {
    setMapping(null);
    setRungs([]);
    setActiveCol(null);
    setStep(2);
  };

  const pairs = useMemo(() => {
    if (!mapping) return [];
    return mapping.map((toIdx, fromIdx) => ({
      fromIdx,
      toIdx,
      fromName: names[fromIdx] || `P${fromIdx + 1}`,
      toName: results[toIdx] || `R${toIdx + 1}`,
    }));
  }, [mapping, names, results]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">사다리타기</h1>
        <Link href="/" className="text-sm text-blue-600 underline">
          ← 홈으로
        </Link>
      </div>
      <div className="mb-6 flex gap-2">
        {['인원수 선택', '이름/결과 입력', '결과 확인'].map((label, i) => (
          <div
            key={label}
            className={`rounded-full px-3 py-1 text-sm ${
              step === i + 1 ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>
      {step === 1 && (
        <div className="grid gap-4 rounded-2xl border p-4">
          <label className="flex items-center gap-3">
            <span className="w-28 text-sm font-semibold">인원수</span>
            <input
              type="number"
            min={2}
              max={10}
              value={count}
              onChange={(e) => {
                const v = Math.min(10, Math.max(2, parseInt(e.target.value || '2')));
                setCount(v);
                setNames(Array(v).fill(''));
                setResults(Array(v).fill(''));
                setMapping(null);
                setRungs([]);
                setActiveCol(null);
              }}
              className="w-28 rounded-lg border px-3 py-2"
            />
            <span className="text-xs text-gray-500">2~10명</span>
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-3">
              <span className="w-28 text-sm font-semibold">가로줄(행)</span>
              <input
                type="number"
                min={6}
                max={60}
                value={rows}
                onChange={(e) =>
                  setRows(Math.min(60, Math.max(6, parseInt(e.target.value || '18'))))
                }
                className="w-28 rounded-lg border px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-3">
              <span className="w-28 text-sm font-semibold">밀도</span>
              <input
                type="number"
                step="0.02"
                min={0.06}
                max={0.6}
                value={density}
                onChange={(e) =>
                  setDensity(
                    Math.min(
                      0.6,
                      Math.max(0.06, parseFloat(e.target.value || '0.28'))
                    )
                  )
                }
                className="w-28 rounded-lg border px-3 py-2"
              />
              <span className="text-xs text-gray-500">가로줄 생성 확률</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="rounded-xl bg-black px-4 py-2 text-white"
            >
              다음 (입력)
            </button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="grid gap-6 rounded-2xl border p-4">
          <div className="grid gap-2">
            <div className="text-sm font-semibold">참가자 이름</div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {Array.from({ length: count }).map((_, i) => (
                <input
                  key={`n-${i}`}
                  placeholder={`P${i + 1}`}
                  value={names[i] ?? ''}
                  onChange={(e) => {
                    const v = [...names];
                    v[i] = e.target.value;
                    setNames(v);
                  }}
                  className="rounded-lg border px-3 py-2"
                />
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <div className="text-sm font-semibold">하단 결과(상품/벌칙 등)</div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {Array.from({ length: count }).map((_, i) => (
                <input
                  key={`r-${i}`}
                  placeholder={`R${i + 1}`}
                  value={results[i] ?? ''}
                  onChange={(e) => {
                    const v = [...results];
                    v[i] = e.target.value;
                    setResults(v);
                  }}
                  className="rounded-lg border px-3 py-2"
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              disabled={!canStart}
              onClick={onBuild}
              className={`rounded-xl px-4 py-2 text-white ${
                canStart ? 'bg-black' : 'bg-gray-400'
              }`}
              title={!canStart ? '모든 칸을 입력하세요' : ''}
            >
              시작 (사다리 생성)
            </button>
            <button
              onClick={() => setStep(1)}
              className="rounded-xl border px-4 py-2"
            >
              이전
            </button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="grid gap-6">
          <div className="rounded-2xl border p-3">
            <LadderSVG
              names={names}
              results={results}
              rows={rows}
              rungs={rungs}
              activeCol={activeCol}
              highlightPaths={activeCol != null}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">결과 하이라이트:</span>
              {names.map((_, i) => (
                <button
                  key={`hl-${i}`}
                  onClick={() => setActiveCol((prev) => (prev === i ? null : i))}
                  className={`rounded-lg border px-3 py-1 text-sm ${
                    activeCol === i ? 'bg-black text-white' : 'bg-white'
                  }`}
                >
                  {names[i] || `P${i + 1}`}
                </button>
              ))}
              <button
                onClick={() => setActiveCol(null)}
                className="rounded-lg border px-3 py-1 text-sm"
              >
                전체 취소
              </button>
            </div>
          </div>
          {mapping && (
            <div className="grid gap-2 rounded-2xl border p-4">
              <div className="text-sm font-semibold">매칭 결과</div>
              <ul className="grid gap-1">
                {pairs.map((p, idx) => (
                  <li
                    key={`pair-${idx}`}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <span className="font-semibold">{p.fromName}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-semibold">{p.toName}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={restart}
              className="rounded-xl bg-black px-4 py-2 text-white"
            >
              다시 설정해서 진행
            </button>
            <button
              onClick={onBuild}
              className="rounded-xl border px-4 py-2"
              title="같은 인원/입력으로 사다리를 새로 생성합니다"
            >
              같은 입력으로 다시 뽑기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
