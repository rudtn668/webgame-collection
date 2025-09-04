'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// =========================
// 상단 네비 (로컬)
// =========================
function TopNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [pathname])

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/games', label: 'Games' },
    { href: '/games/ladder', label: 'Ladder' },
  ]

  return (
    <div className="sticky top-0 z-50 w-full">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 to-transparent" />
      <nav className="mx-auto max-w-6xl rounded-b-2xl border border-neutral-800/60 bg-neutral-900/70 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/50">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="group inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500" />
            <span className="text-lg font-semibold tracking-tight text-white">Webgame Collection</span>
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    active ? 'text-white' : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-2 -bottom-1 block h-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" />
                  )}
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
  const [lanes, setLanes] = useState(5)
  const [rows, setRows] = useState(14)
  const [density, setDensity] = useState(0.28)
  const [rungs, setRungs] = useState<Rung[]>([])

  const [startLabels, setStartLabels] = useState<string[]>(() => Array.from({ length: lanes }, (_, i) => `P${i + 1}`))
  const [endLabels, setEndLabels] = useState<string[]>(() => Array.from({ length: lanes }, (_, i) => `A${i + 1}`))

  const [animate, setAnimate] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [startCol, setStartCol] = useState<number | null>(null)
  const [path, setPath] = useState<Array<[number, number]>>([])
  const [showMapping, setShowMapping] = useState(false)

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
    setPath([])
    setStartCol(null)
    setIsRunning(false)
    setElapsed(0)
    setShowMapping(false)
  }, [rows, lanes, density])

  // == 로직 ==
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

  // == 러너 상태 ==
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

  // == 러너 진행 ==
  useEffect(() => {
    if (!isRunning || !tracer) return
    const speedDown = Math.max(180, rowGap * 4)
    const speedHoriz = Math.max(220, colGap * 4)

    const tick = (now: number) => {
      if (!startTimeRef.current) startTimeRef.current = now
      const prev = prevTimeRef.current ?? now
      const deltaSec = Math.min(0.05, (now - prev) / 1000)
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

  const showAllResults = () => {
    setIsRunning(false)
    setTracer(null)
    setPath([])
    setShowMapping(true)
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <TopNav />
      <section className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-2 text-2xl font-bold">사다리 타기</h1>
        <p className="mb-4 text-neutral-300">위치 싱크 수정</p>

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
            {/* ✅ 가로줄 (y좌표 +1 row) */}
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
          </svg>
        </div>
      </section>
    </main>
  )
}
