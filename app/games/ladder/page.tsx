'use client'

// =========================
// components/TopNav.tsx
// =========================
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/games', label: 'Games' },
  { href: '/games/ladder', label: 'Ladder' },
]

export function TopNav() {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    setOpen(false) // close on route change
  }, [pathname])

  return (
    <div className="sticky top-0 z-50 w-full">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 to-transparent" />
      <nav className="mx-auto max-w-6xl rounded-b-2xl border border-neutral-800/60 bg-neutral-900/70 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="group inline-flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500" />
              <span className="text-lg font-semibold tracking-tight text-white">Webgame Collection</span>
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'text-white'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  {item.label}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-2 -bottom-1 h-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                    />
                  )}
                </Link>
              )
            })}
          </div>

          {/* Mobile button */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-700 text-neutral-100 md:hidden"
            aria-label="Toggle Menu"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              {open ? (
                <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.17 12l6.72-7.71 1.41 1.42z" />
              ) : (
                <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden"
            >
              <div className="border-t border-neutral-800/60 px-2 py-2">
                {navItems.map((item) => {
                  const active = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block rounded-lg px-3 py-2 text-sm ${
                        active ? 'bg-neutral-800 text-white' : 'text-neutral-300 hover:bg-neutral-800/70 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </div>
  )
}

// =========================
// components/LadderGame.tsx
// =========================
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'

// 사다리 타입
type Rung = { row: number; col: number }

function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000)
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export default function LadderGame() {
  const [lanes, setLanes] = useState(5) // 세로줄 개수
  const [rows, setRows] = useState(14) // 가로줄 레벨 수
  const [density, setDensity] = useState(0.28) // 가로줄 생성 확률
  const [rungs, setRungs] = useState<Rung[]>([])

  const [startCol, setStartCol] = useState<number | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(720)
  const height = Math.max(420, Math.min(880, rows * 36 + 160))

  // 반응형
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

  // 사다리 생성
  const regenerate = React.useCallback(() => {
    const newRungs: Rung[] = []
    for (let r = 0; r < rows; r++) {
      let prevPlacedAt = -99
      for (let c = 0; c < lanes - 1; c++) {
        const canPlace = c - prevPlacedAt > 1 // 같은 줄에 인접 가로줄 금지
        if (canPlace && Math.random() < density) {
          newRungs.push({ row: r, col: c })
          prevPlacedAt = c
        }
      }
    }
    setRungs(newRungs)
    setStartCol(null)
    setIsRunning(false)
    setElapsed(0)
    setTracer(null)
    setPath([])
  }, [rows, lanes, density])

  useEffect(() => {
    regenerate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, lanes, density])

  // 좌표계
  const margin = 40
  const colGap = (width - margin * 2) / (lanes - 1)
  const rowGap = (height - margin * 2) / rows

  // 빠르게 결과만 계산 (애니메이션 없이)
  const hasRung = (row: number, col: number) => rungs.some((r) => r.row === row && r.col === col)
  const follow = (colStart: number) => {
    let col = colStart
    for (let r = 0; r < rows; r++) {
      if (hasRung(r, col)) {
        col = col + 1
      } else if (col - 1 >= 0 && hasRung(r, col - 1)) {
        col = col - 1
      }
    }
    return col // 도착 컬럼
  }

  // 애니메이션 상태
  const [tracer, setTracer] = useState<{
    x: number
    y: number
    col: number
    row: number
    mode: 'down' | 'horiz'
    targetX: number
    targetY: number
  } | null>(null)
  const [path, setPath] = useState<Array<[number, number]>>([])
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  const startFrom = (col: number) => {
    if (isRunning) return
    const x0 = margin + col * colGap
    const y0 = margin
    setPath([[x0, y0]])
    setTracer({ x: x0, y: y0, col, row: 0, mode: 'down', targetX: x0, targetY: margin + rowGap })
    setStartCol(col)
    setIsRunning(true)
    setElapsed(0)
    startTimeRef.current = performance.now()
  }

  // 러너 진행
  useEffect(() => {
    if (!isRunning || !tracer) return

    const speedDown = Math.max(180, rowGap * 4) // px/s
    const speedHoriz = Math.max(220, colGap * 4)

    const tick = (now: number) => {
      if (!startTimeRef.current) startTimeRef.current = now
      setElapsed(now - startTimeRef.current)

      setTracer((prev) => {
        if (!prev) return prev
        let { x, y, col, row, mode, targetX, targetY } = prev

        const dt = 1 / 60 // 60fps 가정
        if (mode === 'down') {
          const step = (speedDown * dt)
          if (y + step >= targetY) {
            y = targetY
            // 가로줄 체크 후 전환
            if (row < rows) {
              if (hasRung(row, col)) {
                // 오른쪽으로 이동
                const nx = margin + (col + 1) * colGap
                mode = 'horiz'
                targetX = nx
              } else if (col - 1 >= 0 && hasRung(row, col - 1)) {
                // 왼쪽으로 이동
                const nx = margin + (col - 1) * colGap
                mode = 'horiz'
                targetX = nx
              } else {
                // 다음 행으로 직진
                row = row + 1
                if (row > rows - 1) {
                  // 끝
                  setIsRunning(false)
                  return { x, y, col, row, mode, targetX, targetY }
                }
                mode = 'down'
                targetY = margin + (row + 1) * rowGap
              }
            }
          } else {
            y += step
          }
        } else if (mode === 'horiz') {
          const step = (speedHoriz * dt)
          if (Math.abs(targetX - x) <= step) {
            x = targetX
            // 가로 이동 완료 -> 열 변경 후 아래로
            const newCol = Math.round((x - margin) / colGap)
            col = newCol
            mode = 'down'
            row = row + 1
            if (row > rows - 1) {
              setIsRunning(false)
              return { x, y, col, row, mode, targetX, targetY }
            }
            targetY = margin + (row + 1) * rowGap
          } else {
            x += Math.sign(targetX - x) * step
          }
        }

        setPath((prevPath) => {
          const last = prevPath[prevPath.length - 1]
          const nx = Math.round(x * 100) / 100
          const ny = Math.round(y * 100) / 100
          if (!last || last[0] !== nx || last[1] !== ny) {
            return [...prevPath, [nx, ny]]
          }
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

  const reset = () => {
    setIsRunning(false)
    setStartCol(null)
    setElapsed(0)
    setTracer(null)
    setPath([])
  }

  // 전체 맵핑 미리보기
  const mapping = useMemo(() => {
    return Array.from({ length: lanes }, (_, i) => ({ from: i, to: follow(i) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lanes, rows, rungs])

  return (
    <div ref={containerRef} className="mx-auto mt-6 max-w-6xl px-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-300">Lanes</span>
          <input
            type="number"
            min={2}
            max={12}
            value={lanes}
            onChange={(e) => setLanes(Math.min(12, Math.max(2, Number(e.target.value) || 2)))}
            className="w-20 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
          />
          <span className="text-sm text-neutral-300">Rows</span>
          <input
            type="number"
            min={6}
            max={30}
            value={rows}
            onChange={(e) => setRows(Math.min(30, Math.max(6, Number(e.target.value) || 6)))}
            className="w-20 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
          />
          <span className="text-sm text-neutral-300">Density</span>
          <input
            type="range"
            min={0.1}
            max={0.5}
            step={0.01}
            value={density}
            onChange={(e) => setDensity(Number(e.target.value))}
            className="h-2 w-40 cursor-pointer"
          />
          <button
            onClick={regenerate}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800"
          >
            사다리 재생성
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => startCol !== null ? startFrom(startCol) : startFrom(0)}
            disabled={isRunning}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white disabled:from-neutral-700 disabled:to-neutral-700"
          >
            {startCol === null ? '0번에서 시작' : `${startCol}번에서 다시 시작`}
          </button>
          <button
            onClick={reset}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
          >
            다시 시작
          </button>
        </div>
      </div>

      {/* 타이머 */}
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm text-neutral-300">진행 시간</div>
        <motion.div
          key={isRunning ? 'on' : 'off'}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`rounded-full px-3 py-1 text-sm font-mono ${
            isRunning ? 'bg-indigo-500/20 text-indigo-200' : 'bg-neutral-800 text-neutral-300'
          }`}
        >
          {fmtTime(elapsed)}
        </motion.div>
      </div>

      {/* 캔버스(SVG) */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/60 p-2">
        <svg width={width} height={height} className="mx-auto block">
          {/* 배경 그리드 */}
          <defs>
            <radialGradient id="glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>

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

          {/* 가로줄 */}
          {rungs.map((r, idx) => (
            <line
              key={`h-${idx}`}
              x1={margin + r.col * colGap}
              x2={margin + (r.col + 1) * colGap}
              y1={margin + r.row * rowGap}
              y2={margin + r.row * rowGap}
              stroke="#71717a"
              strokeWidth={4}
              strokeLinecap="round"
            />
          ))}

          {/* 시작 선택 핀 */}
          {Array.from({ length: lanes }, (_, i) => (
            <g key={`pin-${i}`}>
              <circle
                cx={margin + i * colGap}
                cy={margin - 16}
                r={8}
                fill={startCol === i ? '#a78bfa' : '#52525b'}
                className="cursor-pointer"
                onClick={() => (isRunning ? null : setStartCol(i))}
              />
              <text
                x={margin + i * colGap}
                y={margin - 26}
                textAnchor="middle"
                fontSize="10"
                fill="#cbd5e1"
              >
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
              <circle cx={tracer.x} cy={tracer.y} r={18} fill="url(#glow)" />
            </g>
          )}

          {/* 도착 인덱스 라벨 */}
          {Array.from({ length: lanes }, (_, i) => (
            <g key={`end-${i}`}>
              <text
                x={margin + i * colGap}
                y={height - margin + 18}
                textAnchor="middle"
                fontSize="10"
                fill="#94a3b8"
              >
                {i}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* 결과 테이블 */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-800">
        <div className="bg-neutral-900/60 px-4 py-3 text-sm font-semibold text-white">전체 결과 미리보기</div>
        <div className="divide-y divide-neutral-800">
          {mapping.map((m) => (
            <div key={m.from} className="grid grid-cols-3 items-center px-4 py-2 text-sm">
              <div className="text-neutral-300">Start: <span className="font-mono text-white">{m.from}</span></div>
              <div className="text-center text-neutral-500">→</div>
              <div className="text-right text-neutral-300">End: <span className="font-mono text-white">{m.to}</span></div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-neutral-500">팁: 위쪽 원형 핀(번호)을 클릭해 시작 지점을 선택하고, “다시 시작”으로 언제든 초기화할 수 있어요.</p>
    </div>
  )
}

// =========================
// (선택) app/games/ladder/page.tsx 예시
// =========================
// 아래 예시는 페이지 파일이 필요할 때 참고용입니다. 프로젝트에 이미 페이지가 있다면 이 블록은 무시하세요.
export function LadderPageExample() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <TopNav />
      <section className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-2 text-2xl font-bold">사다리 타기</h1>
        <p className="mb-4 text-neutral-300">애니메이션, 타이머, 전체 매핑 미리보기 지원</p>
        <LadderGame />
      </section>
    </main>
  )
}
