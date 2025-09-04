'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// =========================
// 상단 네비 (로컬)
// =========================
function TopNav() {
  const pathname = usePathname()
  const navItems = [
    { href: '/', label: '← 홈' },
  ]
  return (
    <div className="sticky top-0 z-50 w-full">
      <nav className="mx-auto max-w-6xl border-b border-neutral-800 bg-neutral-900/70 backdrop-blur">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-xl px-3 py-2 text-sm font-medium ${
                    active ? 'text-white' : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  {item.label}
                  {active && <span className="absolute inset-x-2 -bottom-1 block h-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" />}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}

// =========================
// 사다리 페이지
// =========================
type Rung = { row: number; col: number }

function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000)
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export default function Page() {
  // 설정
  const [lanes, setLanes] = useState(5)
  const [rows, setRows] = useState(14)
  const [density, setDensity] = useState(0.28)
  const [rungs, setRungs] = useState<Rung[]>([])

  // 라벨
  const [startLabels, setStartLabels] = useState<string[]>(() => Array.from({ length: lanes }, (_, i) => `P${i + 1}`))
  const [endLabels, setEndLabels] = useState<string[]>(() => Array.from({ length: lanes }, (_, i) => `A${i + 1}`))

  // 진행/표시 상태
  const [animate, setAnimate] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [startCol, setStartCol] = useState<number | null>(null)
  const [path, setPath] = useState<Array<[number, number]>>([])
  const [showMapping, setShowMapping] = useState(false)

  // 반응형
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(720)
  const height = Math.max(420, Math.min(880, rows * 36 + 160))
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.min(960, Math.max(360, entry.contentRect.width))
        setWidth(w)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 좌표 (SVG/입력칸 공통)
  const margin = 40
  const colGap = (width - margin * 2) / (lanes - 1)
  const rowGap = (height - margin * 2) / rows

  // 사다리 생성
  const regenerate = React.useCallback(() => {
    const newRungs: Rung[] = []
    for (let r = 0; r < rows; r++) {
      let prevPlacedAt = -99
      for (let c = 0; c < lanes - 1; c++) {
        const canPlace = c - prevPlacedAt > 1
        if (canPlace && Math.random() < density) {
          newRungs.push({ row: r, col: c })
          prevPlacedAt = c
        }
      }
    }
    setRungs(newRungs)
    // 재생성 시 경로/결과 숨김
    setPath([])
    setStartCol(null)
    setIsRunning(false)
    setElapsed(0)
    setShowMapping(false)
  }, [rows, lanes, density])

  // lanes 변경 시 라벨 길이 보정
  useEffect(() => {
    setStartLabels((prev) => {
      const next = [...prev]
      next.length = lanes
      for (let i = 0; i < lanes; i++) if (!next[i]) next[i] = `P${i + 1}`
      return next
    })
    setEndLabels((prev) => {
      const next = [...prev]
      next.length = lanes
      for (let i = 0; i < lanes; i++) if (!next[i]) next[i] = `A${i + 1}`
      return next
    })
  }, [lanes])

  // 초기/설정 변경 시 재생성
  useEffect(() => {
    regenerate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, lanes, density])

  // 유틸
  const hasRung = (row: number, col: number) => rungs.some((r) => r.row === row && r.col === col)
  const follow = (colStart: number) => {
    let col = colStart
    for (let r = 0; r < rows; r++) {
      if (hasRung(r, col)) col = col + 1
      else if (col - 1 >= 0 && hasRung(r, col - 1)) col = col - 1
    }
    return col
  }
  const mapping = useMemo(() => Array.from({ length: lanes }, (_, i) => ({ from: i, to: follow(i) })), [lanes, rows, rungs])

  // 러너 상태
  const [tracer, setTracer] = useState<{
    x: number; y: number; col: number; row: number; mode: 'down' | 'horiz'; targetX: number; targetY: number
  } | null>(null)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const prevTimeRef = useRef<number | null>(null)

  const beginFrom = (col: number) => {
    setShowMapping(false)
    setStartCol(col)
    setElapsed(0)
    setPath([])

    if (!animate) {
      // 즉시 결과 모드
      setIsRunning(false)
      setTracer(null)
      setShowMapping(true)
      return
    }

    const x0 = margin + col * colGap
    const y0 = margin
    setPath([[x0, y0]])
    setTracer({ x: x0, y: y0, col, row: 0, mode: 'down', targetX: x0, targetY: margin + rowGap })
    setIsRunning(true)
    startTimeRef.current = performance.now()
    prevTimeRef.current = null
  }

  // 애니메이션 진행 (deltaSec 기반)
  useEffect(() => {
    if (!isRunning || !tracer) return
    const speedDown = Math.max(180, rowGap * 4)     // px/s
    const speedHoriz = Math.max(220, colGap * 4)    // px/s

    const tick = (now: number) => {
      if (!startTimeRef.current) startTimeRef.current = now
      const prev = prevTimeRef.current ?? now
      const deltaSec = Math.min(0.05, (now - prev) / 1000) // 50ms 캡
      prevTimeRef.current = now
      setElapsed(now - startTimeRef.current)

      setTracer((prevState) => {
        if (!prevState) return prevState
        let { x, y, col, row, mode, targetX, targetY } = prevState

        if (mode === 'down') {
          const step = speedDown * deltaSec
          if (y + step >= targetY - 0.001) {
            y = targetY
            if (row < rows) {
              if (hasRung(row, col)) {
                mode = 'horiz'
                targetX = margin + (col + 1) * colGap
              } else if (col - 1 >= 0 && hasRung(row, col - 1)) {
                mode = 'horiz'
                targetX = margin + (col - 1) * colGap
              } else {
                row = row + 1
                if (row > rows - 1) {
                  setIsRunning(false)
                  setShowMapping(true)
                  return { x, y, col, row, mode, targetX, targetY }
                }
                mode = 'down'
                targetY = margin + (row + 1) * rowGap
              }
            }
          } else {
            y += step
          }
        } else {
          const step = speedHoriz * deltaSec
          const dir = Math.sign(targetX - x) || 1
          if (Math.abs(targetX - x) <= step + 0.001) {
            x = targetX
            col = Math.round((x - margin) / colGap)
            mode = 'down'
            row = row + 1
            if (row > rows - 1) {
              setIsRunning(false)
              setShowMapping(true)
              return { x, y, col, row, mode, targetX, targetY }
            }
            targetY = margin + (row + 1) * rowGap
          } else {
            x += dir * step
          }
        }

        setPath((prevPath) => {
          const last = prevPath[prevPath.length - 1]
          const nx = Math.round(x * 100) / 100
          const ny = Math.round(y * 100) / 100
          if (!last || last[0] !== nx || last[1] !== ny) return [...prevPath, [nx, ny]]
          return prevPath
        })

        return { x, y, col, row, mode, targetX, targetY }
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [isRunning, tracer, rows, rowGap, colGap])

  // 전체 결과 보기
  const showAllResults = () => {
    setIsRunning(false)
    setTracer(null)
    setPath([])
    setShowMapping(true)
  }

  // 라벨 업데이트
  const updateStartLabel = (i: number, val: string) =>
    setStartLabels((prev) => prev.map((v, idx) => (idx === i ? val : v)))
  const updateEndLabel = (i: number, val: string) =>
    setEndLabels((prev) => prev.map((v, idx) => (idx === i ? val : v)))

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <TopNav />

      <section className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-2 text-2xl font-bold">사다리 타기</h1>

        {/* 컨트롤 바 */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-300">Lanes</span>
            <input
              type="number" min={2} max={12} value={lanes}
              onChange={(e) => setLanes(Math.min(12, Math.max(2, Number(e.target.value) || 2)))}
              className="w-20 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
            />
            <span className="text-sm text-neutral-300">Rows</span>
            <input
              type="number" min={6} max={30} value={rows}
              onChange={(e) => setRows(Math.min(30, Math.max(6, Number(e.target.value) || 6)))}
              className="w-20 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
            />
            <span className="text-sm text-neutral-300">Density</span>
            <input
              type="range" min={0.1} max={0.5} step={0.01} value={density}
              onChange={(e) => setDensity(Number(e.target.value))}
              className="h-2 w-40 cursor-pointer"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <label className="flex select-none items-center gap-2 text-sm text-neutral-300">
              <input type="checkbox" checked={animate} onChange={(e) => setAnimate(e.target.checked)} />
              애니메이션
            </label>
            <button
              onClick={regenerate}
              className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800"
            >
              사다리 재생성
            </button>
            <button
              onClick={showAllResults}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white"
            >
              결과 바로보기
            </button>
          </div>
        </div>

        {/* === 입력칸 정렬: SVG와 같은 width/margin/grid === */}
        {/* Start 라벨 */}
        <div className="mx-auto" style={{ width }}>
          <div style={{ paddingLeft: margin, paddingRight: margin }}>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${lanes}, minmax(0, 1fr))` }}>
              {Array.from({ length: lanes }, (_, i) => (
                <div key={`s-${i}`} className="flex flex-col items-center">
                  <input
                    value={startLabels[i] ?? ''}
                    onChange={(e) => updateStartLabel(i, e.target.value)}
                    placeholder={`Start ${i}`}
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-center text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 캔버스 */}
        <div ref={containerRef} className="relative mt-2 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/60 p-2">
          <svg width={width} height={height} className="mx-auto block">
            {/* 세로줄 */}
            {Array.from({ length: lanes }, (_, i) => (
              <line
                key={`v-${i}`}
                x1={margin + i * colGap}
                x2={margin + i * colGap}
                y1={margin}
                y2={height - margin}
                stroke="#3f3f46"
                strokeWidth={3}
                strokeLinecap="round"
              />
            ))}
            {/* ✅ 가로줄: 시각/논리 싱크를 위해 (row+1) 위치에 그림 */}
            {rungs.map((r, idx) => (
              <line
                key={`h-${idx}`}
                x1={margin + r.col * colGap}
                x2={margin + (r.col + 1) * colGap}
                y1={margin + (r.row + 1) * rowGap}
                y2={margin + (r.row + 1) * rowGap}
                stroke="#71717a"
                strokeWidth={4}
                strokeLinecap="round"
              />
            ))}
            {/* 시작 핀 (클릭 즉시 진행) */}
            {Array.from({ length: lanes }, (_, i) => (
              <g key={`pin-${i}`} className="cursor-pointer" onClick={() => beginFrom(i)}>
                <circle
                  cx={margin + i * colGap}
                  cy={margin - 16}
                  r={8}
                  fill={startCol === i ? '#a78bfa' : '#52525b'}
                />
                <text x={margin + i * colGap} y={margin - 26} textAnchor="middle" fontSize="10" fill="#cbd5e1">
                  {i}
                </text>
              </g>
            ))}
            {/* 진행 경로 */}
            {path.length > 1 && (
              <polyline
                points={path.map((p) => p.join(',')).join(' ')}
                fill="none"
                stroke="#a78bfa"
                strokeWidth={5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {/* 러너 */}
            {tracer && (
              <g>
                <circle cx={tracer.x} cy={tracer.y} r={7} fill="#ffffff" />
                <circle cx={tracer.x} cy={tracer.y} r={18} fill="rgba(255,255,255,0.15)" />
              </g>
            )}
            {/* 도착 인덱스 라벨 */}
            {Array.from({ length: lanes }, (_, i) => (
              <text
                key={`end-${i}`}
                x={margin + i * colGap}
                y={height - margin + 18}
                textAnchor="middle"
                fontSize="10"
                fill="#94a3b8"
              >
                {i}
              </text>
            ))}
          </svg>
        </div>

        {/* End 라벨 (동일 정렬) */}
        <div className="mx-auto mt-2" style={{ width }}>
          <div style={{ paddingLeft: margin, paddingRight: margin }}>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${lanes}, minmax(0, 1fr))` }}>
              {Array.from({ length: lanes }, (_, i) => (
                <div key={`e-${i}`} className="flex flex-col items-center">
                  <input
                    value={endLabels[i] ?? ''}
                    onChange={(e) => updateEndLabel(i, e.target.value)}
                    placeholder={`End ${i}`}
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-center text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 상태/결과 바 */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-neutral-300">
            진행 시간 <span className="ml-2 rounded-full bg-neutral-800 px-2 py-0.5 font-mono">{fmtTime(elapsed)}</span>
          </div>
          <div className="text-sm text-neutral-400">
            {startCol !== null ? (
              <>
                선택: <span className="font-mono text-white">{startLabels[startCol] ?? startCol}</span> → 도착:{' '}
                <span className="font-mono text-white">{endLabels[follow(startCol)] ?? follow(startCol)}</span>
              </>
            ) : (
              <>상단 핀을 클릭하면 진행합니다</>
            )}
          </div>
        </div>

        {/* 전체 결과 */}
        {showMapping && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-800">
            <div className="bg-neutral-900/60 px-4 py-3 text-sm font-semibold text-white">전체 결과</div>
            <div className="divide-y divide-neutral-800">
              {mapping.map((m) => (
                <div key={m.from} className="grid grid-cols-3 items-center px-4 py-2 text-sm">
                  <div className="text-neutral-300">{startLabels[m.from] ?? `Start ${m.from}`}</div>
                  <div className="text-center text-neutral-500">→</div>
                  <div className="text-right text-neutral-300">{endLabels[m.to] ?? `End ${m.to}`}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
