'use client';

import { useEffect, useRef, useState } from 'react';

type Row = { name: string; score: number };

function newRunId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return (crypto as any).randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2,'0');
  const ss = String(s % 60).padStart(2,'0');
  return mm + ':' + ss;
}

const RADIUS = 20; // px
const TARGET_SIZE = 40; // px (2 * RADIUS)

export default function Page() {
  const [runId, setRunId] = useState('');
  const [name, setName] = useState('');
  const [board, setBoard] = useState<Row[]>([]);

  const [timeLeft, setTimeLeft] = useState(30000);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const arenaRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<{ x:number; y:number } | null>(null);
  const rafRef = useRef<number | null>(null);

  async function fetchLeaderboard(): Promise<Row[]> {
    try {
      const r = await fetch('/api/leaderboard?game=aim&limit=10', { cache: 'no-store' });
      if ((r.headers.get('content-type') || '').includes('application/json')) {
        return await r.json();
      }
      await r.text();
      return [];
    } catch {
      return [];
    }
  }

  function clamp(v:number, min:number, max:number){ return Math.max(min, Math.min(max, v)); }

  function spawn() {
    const el = arenaRef.current; if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const x = clamp(Math.random() * w, RADIUS, w - RADIUS);
    const y = clamp(Math.random() * h, RADIUS, h - RADIUS);
    setTarget({ x, y });
  }

  function start() {
    if (running) return;
    setRunId(newRunId());
    setTimeLeft(30000);
    setScore(0);
    setError(null);
    setRunning(true);
    spawn();

    const started = performance.now();
    const tick = () => {
      const left = Math.max(0, 30000 - (performance.now() - started));
      setTimeLeft(left);
      if (left > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setRunning(false);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function stop() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    setRunning(false);
  }

  async function submitScore() {
    try {
      if (!name.trim()) { setError('이름을 입력하세요.'); return; }
      const r = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'aim', name: name.trim(), score, runId }),
      });
      const ct = r.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await r.json() : { ok:false, error:'NON_JSON' };
      if (!r.ok || (data as any)?.ok === false) {
        setError((data as any)?.error || '제출 실패');
      } else {
        setError(null);
        setBoard(await fetchLeaderboard());
      }
    } catch (e:any) {
      setError(e?.message || '클라이언트 예외');
    }
  }

  useEffect(() => {
    setRunId(newRunId());
    fetchLeaderboard().then(setBoard).catch(()=>{});
    const onKey = (ev: KeyboardEvent) => {
      if (ev.code === 'Space') { ev.preventDefault(); running ? stop() : start(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [running]);

  return (
    <main className="container">
      <a className="muted" href="/">← 홈</a>
      <h1 className="title">AIM 훈련 (30초)</h1>

      <div className="hud">
        <div>남은 시간: <strong>{fmtTime(timeLeft)}</strong></div>
        <div>점수: <strong>{score}</strong></div>
      </div>

      <div
        className={'arena ' + (running ? 'running' : 'stopped')}
        ref={arenaRef}
      >
        {!running && <button className="primary" onClick={start}>시작</button>}
        {target && running && (
          <div
            className="target"
            role="button"
            aria-label="hit target"
            onPointerDown={(e)=>{ e.preventDefault(); e.stopPropagation(); setScore(s=>s+1); spawn(); }}
            onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); setScore(s=>s+1); spawn(); }}
            style={{ transform: 'translate(' + target.x + 'px, ' + target.y + 'px)' }}
          />
        )}
      </div>

      {!running && (
        <div className="submitBox">
          <input placeholder="이름" value={name} onChange={e=>setName(e.target.value)} maxLength={20} />
          <div className="row">
            <button onClick={submitScore}>리더보드 등록</button>
            <button onClick={start}>다시 시작</button>
          </div>
          {error && <p className="error">{error}</p>}
        </div>
      )}

      <section>
        <h2>리더보드 (Top 10)</h2>
        <ol className="board">
          {board.map((r,i)=>(
            <li key={i}><span className="rank">{i+1}</span> <span className="nm">{r.name}</span> <span className="sc">{r.score}</span></li>
          ))}
        </ol>
      </section>

      <style jsx>{`
        .container{max-width:800px;margin:0 auto;padding:24px;color:#eee}
        .title{margin:8px 0 16px}
        .muted{color:#aaa;text-decoration:none}
        .hud{display:flex;gap:16px;margin-bottom:12px;opacity:.9}
        .arena{position:relative;height:360px;border-radius:12px;background:#222;display:flex;align-items:center;justify-content:center;user-select:none;touch-action:manipulation;overflow:hidden}
        .primary{padding:10px 16px;border-radius:10px;border:0;background:#444;color:#fff;font-weight:700;cursor:pointer}
        .target{position:absolute;width:40px;height:40px;border-radius:9999px;background:#ddd;transform:translate(-50%,-50%);box-shadow:0 0 0 3px rgba(255,255,255,.25) inset;cursor:crosshair;pointer-events:auto}
        .submitBox{display:flex;flex-direction:column;gap:10px;align-items:center;margin-top:12px}
        .submitBox input{padding:8px 10px;border-radius:8px;border:1px solid #555;background:#111;color:#fff}
        .row{display:flex;gap:8px}
        .error{color:#f88}
        .board{list-style:none;padding:0;margin:0}
        .board li{display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #333}
        .rank{width:24px;text-align:right;opacity:.8}
        .nm{flex:1}
        .sc{font-variant-numeric:tabular-nums}
        @media (max-width:480px){.arena{height:300px}}
      `}</style>
    </main>
  );
}
