// app/games/ladder/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";";
import type { Rung } from "@/lib/ladder";

type Pair = {
  fromIdx: number;
  toIdx: number;
  fromName: string;
  toName: string;
};

// ---- Ladder helpers (client-side copy; SSR helpers are in lib/ladder.ts) ----
type RungT = Rung;
function walkLadder(startCol: number, cols: number, rows: number, rungs: RungT[]) {
  let c = startCol;
  for (let r = 0; r < rows; r++) {
    const right = rungs.find((x) => x.row === r && x.col === c);
    if (right) {
      c = c + 1;
    } else {
      const left = rungs.find((x) => x.row === r && x.col === c - 1);
      if (left) c = c - 1;
    }
  }
  return c;
}

type Rng = () => number;
function mulberry32(seed: number): Rng {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateLadder(cols: number, rows: number, density = 0.28, seed?: number): RungT[] {
  const rands = seed != null ? mulberry32(seed) : Math.random;
  const rungs: RungT[] = [];
  if (cols <= 1) return rungs;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const leftTaken = rungs.some((x) => x.row === r && x.col === c - 1);
      if (leftTaken) continue;
      if (rands() < density) rungs.push({ row: r, col: c });
    }
  }
  return rungs;
}

// ---- SVG View ----
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
  rungs: RungT[];
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
      pathPoints.push({
        x1: lineX(c),
        y1: r === 0 ? paddingTop : lineY(r - 1),
        x2: lineX(c),
        y2: lineY(r),
      });
      const right = rungs.find((x) => x.row === r && x.col === c);
      const left = rungs.find((x) => x.row === r && x.col === c - 1);
      if (right) {
        pathPoints.push({ x1: lineX(c), y1: lineY(r), x2: lineX(c + 1), y2: lineY(r) });
        c = c + 1;
      } else if (left) {
        pathPoints.push({ x1: lineX(c), y1: lineY(r), x2: lineX(c - 1), y2: lineY(r) });
        c = c - 1;
      }
    }
    pathPoints.push({
      x1: lineX(c),
      y1: lineY(rows - 1),
      x2: lineX(c),
      y2: height - paddingBottom,
    });
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full rounded-2xl border shadow-sm">
      {Array.from({ length: cols }).map((_, c) => (
        <line key={`v-${c}`} x1={lineX(c)} y1={paddingTop} x2={lineX(c)} y2={height - paddingBottom} stroke="#d1d5db" strokeWidth={2} />
      ))}
      {rungs.map((r, idx) => (
        <line key={`h-${idx}`} x1={lineX(r.col)} y1={lineY(r.row)} x2={lineX(r.col + 1)} y2={lineY(r.row)} stroke="#9ca3af" strokeWidth={3} />
      ))}
      {names.map((n, c) => (
        <text key={`name-${c}`} x={lineX(c)} y={paddingTop - 20} textAnchor="middle" className="fill-gray-800" style={{ fontSize: 14, fontWeight: 700 }}>
          {n || `P${c + 1}`}
        </text>
      ))}
      {results.map((n, c) => (
        <text key={`res-${c}`} x={lineX(c)} y={height - paddingBottom + 24} textAnchor="middle" className="fill-gray-700" style={{ fontSize: 13, fontWeight: 600 }}>
          {n || `R${c + 1}`}
        </text>
      ))}
      {highlightPaths &&
        pathPoints.map((p, i) => (
          <line key={`path-${i}`} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke="#111827" strokeWidth={4} strokeLinecap="round" opacity={0.9} />
        ))}
    </svg>
  );
}

export default function LadderPage() {
  const [sharedId, setSharedId] = useState<string | null>(null);
  

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [count, setCount] = useState(4);
  const [names, setNames] = useState<string[]>(() => Array(4).fill(""));
  const [results, setResults] = useState<string[]>(() => Array(4).fill(""));
  const [rows, setRows] = useState(18);
  const [density, setDensity] = useState(0.28);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [rungs, setRungs] = useState<RungT[]>([]);
  const [mapping, setMapping] = useState<number[] | null>(null);
  const [activeCol, setActiveCol] = useState<number | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canStart =
    names.filter((x) => x.trim().length > 0).length === count &&
    results.filter((x) => x.trim().length > 0).length === count;

    useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  setSharedId(params.get('id'));
}, []);

  // 공유 id로 불러오기
  useEffect(() => {
    const id = sharedId;
    if (!id) return;
    setLoading(true);
    fetch(`/api/ladder/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data?.config) {
          const cfg = data.config;
          setNames(cfg.names ?? []);
          setResults(cfg.results ?? []);
          setRows(cfg.rows ?? 18);
          setDensity(cfg.density ?? 0.28);
          setSeed(cfg.seed);
          setRungs(cfg.rungs ?? []);
          const cols = (cfg.names ?? []).length;
          const m: number[] = [];
          for (let c = 0; c < cols; c++) m.push(walkLadder(c, cols, cfg.rows ?? 18, cfg.rungs ?? []));
          setMapping(m);
          setStep(3);
        }
      })
      .finally(() => setLoading(false));
  }, [sharedId]);

  // 인원수 변경
  const applyCount = (n: number) => {
    const v = Math.min(10, Math.max(2, n | 0));
    setCount(v);
    setNames(Array(v).fill(""));
    setResults(Array(v).fill(""));
    setMapping(null);
    setRungs([]);
    setActiveCol(null);
    setSeed(undefined);
    setShareUrl(null);
  };

  const onBuild = () => {
    // seed가 있으면 재현, 없으면 무작위 seed
    const s = seed != null ? seed : Math.floor(Math.random() * 2 ** 31);
    setSeed(s);
    const ladder = generateLadder(count, rows, density, s);
    setRungs(ladder);

    const m: number[] = [];
    for (let c = 0; c < count; c++) m.push(walkLadder(c, count, rows, ladder));
    setMapping(m);
    setStep(3);
    setShareUrl(null);
  };

  const pairs: Pair[] = useMemo(() => {
    if (!mapping) return [];
    return mapping.map((dst, i) => ({
      fromIdx: i,
      toIdx: dst,
      fromName: names[i] || `P${i + 1}`,
      toName: results[dst] || `R${dst + 1}`,
    }));
  }, [mapping, names, results]);

  const restart = () => {
    setMapping(null);
    setRungs([]);
    setActiveCol(null);
    setStep(2);
    setShareUrl(null);
  };

  const share = async () => {
    try {
      setLoading(true);
      const runId = crypto.randomUUID();
      const res = await fetch("/api/ladder/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ names, results, rows, density, rungs, seed, runId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "save_failed");
      const url = data.url as string;
      setShareUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        alert("공유 링크가 클립보드에 복사되었어요!");
      } catch {
        // ignore
      }
    } catch (e: any) {
      alert("저장/공유에 실패했습니다: " + (e?.message ?? "error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">사다리타기</h1>
        <Link href="/" className="text-sm text-blue-600 underline">
          ← 홈으로
        </Link>
      </div>

      {/* Step Indicator */}
      <div className="mb-6 flex gap-2">
        {["인원수 선택", "이름/결과 입력", "결과 확인"].map((label, i) => (
          <div
            key={label}
            className={`rounded-full px-3 py-1 text-sm ${
              step === (i + 1) ? "bg-black text-white" : "bg-gray-200 text-gray-700"
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
              onChange={(e) => applyCount(parseInt(e.target.value || "2"))}
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
                onChange={(e) => setRows(Math.min(60, Math.max(6, parseInt(e.target.value || "18"))))}
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
                  setDensity(Math.min(0.6, Math.max(0.06, parseFloat(e.target.value || "0.28"))))
                }
                className="w-28 rounded-lg border px-3 py-2"
              />
              <span className="text-xs text-gray-500">가로줄 생성 확률</span>
            </label>
            <label className="flex items-center gap-3">
              <span className="w-28 text-sm font-semibold">Seed</span>
              <input
                type="number"
                placeholder="(선택) 동일 사다리 재현"
                value={seed ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? undefined : parseInt(e.target.value);
                  setSeed(Number.isFinite(v as number) ? (v as number) : undefined);
                }}
                className="w-36 rounded-lg border px-3 py-2"
              />
            </label>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="rounded-xl bg-black px-4 py-2 text-white">
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
                  value={names[i] ?? ""}
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
                  value={results[i] ?? ""}
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
              className={`rounded-xl px-4 py-2 text-white ${canStart ? "bg-black" : "bg-gray-400"}`}
              title={!canStart ? "모든 칸을 입력하세요" : ""}
            >
              시작 (사다리 생성)
            </button>
            <button onClick={() => setStep(1)} className="rounded-xl border px-4 py-2">
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
                  className={`rounded-lg border px-3 py-1 text-sm ${activeCol === i ? "bg-black text-white" : "bg-white"}`}
                >
                  {names[i] || `P${i + 1}`}
                </button>
              ))}
              <button onClick={() => setActiveCol(null)} className="rounded-lg border px-3 py-1 text-sm">
                전체 취소
              </button>
            </div>
          </div>

          {mapping && (
            <div className="grid gap-2 rounded-2xl border p-4">
              <div className="text-sm font-semibold">매칭 결과</div>
              <ul className="grid gap-1">
                {mapping.map((dst, i) => (
                  <li key={`pair-${i}`} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <span className="font-semibold">{names[i] || `P${i + 1}`}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-semibold">{results[dst] || `R${dst + 1}`}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button onClick={restart} className="rounded-xl bg-black px-4 py-2 text-white">
              다시 설정해서 진행
            </button>
            <button onClick={onBuild} className="rounded-xl border px-4 py-2" title="같은 인원/입력으로 사다리를 새로 생성합니다">
              같은 입력으로 다시 뽑기
            </button>
            <button onClick={share} disabled={loading} className="rounded-xl border px-4 py-2">
              {loading ? "저장 중..." : "공유 링크 만들기"}
            </button>
            {shareUrl && (
              <a href={shareUrl} className="rounded-xl border px-4 py-2 underline" target="_blank" rel="noreferrer">
                공유 링크 열기
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
