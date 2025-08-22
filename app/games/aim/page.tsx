'use client';
export const metadata = {
  title: 'AIM 훈련 (30초)',
  description: '30초 동안 원형 타겟을 최대한 많이 맞히고 리더보드에 등록하세요.',
  alternates: { canonical: '/games/aim' },
  openGraph: { title: 'AIM 훈련 (30초)', description: '타겟을 맞혀 점수를 올리고 리더보드에 도전!', url: '/games/aim' },
};


import { useEffect, useRef, useState } from 'react';

type Row = { name: string; score: number };

function newRunId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return (crypto as any).randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function fmtTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return mm + ':' + ss;
}

const SIZE = 40; // target size px

export default function Page() {
  const [runId, setRunId] = useState('');
  const [name, setName] = useState('');
  const [board, setBoard] = useState<Row[]>([]);

  const [timeLeft, setTimeLeft] = useState(30000);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const arenaRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const intervalRef = useRef<any>(null);
  const endAtRef = useRef<number>(0);

  async function fetchLeaderboard(): Promise<Row[]> {
    try {
      const r = await fetch('/api/leaderboard?game=aim&limit=10', { cache: 'no-store' });
      if ((r.headers.get('content-type') || '').includes('application/json')) return await r.json();
      await r.text();
      return [];
    } catch {
      return [];
    }
  }

  function spawn() {
    const el = arenaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = Math.max(0, rect.width);
    const h = Math.max(0, rect.height);
    if (w < SIZE || h < SIZE) {
      // 아직 레이아웃이 안 잡혔으면 다음 틱에 재시도
      requestAnimationFrame(spawn);
      return;
    }
    const left = Math.floor(Math.random() * (w - SIZE));
    const top = Math.floor(Math.random() * (h - SIZE));
    setPos({ left, top });
  }

  function clampToBounds(p: {left:number; top:number}) {
    const el = arenaRef.current; if (!el) return p;
    const rect = el.getBoundingClientRect();
    const w = Math.max(0, rect.width);
    const h = Math.max(0, rect.height);
    return {
      left: Math.min(Math.max(0, p.left), Math.max(0, w - SIZE)),
      top: Math.min(Math.max(0, p.top), Math.max(0, h - SIZE)),
    };
  }

  function start() {
    if (running) return;
    setRunId(newRunId());
    setTimeLeft(30000);
    setScore(0);
    setError(null);
    setRunning(true);
    // 타이머 (setInterval 기반으로 안정)
    const endAt = Date.now() + 30000;
    endAtRef.current = endAt;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const left = Math.max(0, endAtRef.current - Date.now());
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setRunning(false);
      }
    }, 100);
    // 타겟 생성
    spawn();
  }

  function stop() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
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
      if (!r.ok || (data as any)?.ok === false) setError((data as any)?.error || '제출 실패');
      else { setError(null); setBoard(await fetchLeaderboard()); }
    } catch (e:any) { setError(e?.message || '클라이언트 예외'); }
  }

  useEffect(() => {
    setRunId(newRunId());
    fetchLeaderboard().then(setBoard).catch(()=>{});
    const onResize = () => { if (pos) setPos(clampToBounds(pos)); };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: 24, color: '#eee' }}>
      <a style={{ color:'#aaa', textDecoration:'none' }} href="/">← 홈</a>
      <h1 style={{ margin:'8px 0 16px' }}>AIM 훈련 (30초)</h1>

      <div style={{ display:'flex', gap:16, marginBottom:12, opacity:.9 }}>
        <div>남은 시간: <strong>{fmtTime(timeLeft)}</strong></div>
        <div>점수: <strong>{score}</strong></div>
      </div>

      <div
        ref={arenaRef}
        style={{ position:'relative', height:360, borderRadius:12, background:'#222',
                 display:'flex', alignItems:'center', justifyContent:'center', userSelect:'none',
                 overflow:'hidden', touchAction:'manipulation' }}
      >
        {!running && <button
          onClick={start}
          style={{ padding:'10px 16px', borderRadius:10, border:0, background:'#444', color:'#fff', fontWeight:700, cursor:'pointer' }}
        >시작</button>}
        {pos && running && (
          <div
            role="button" aria-label="hit target"
            onPointerDown={(e)=>{ e.preventDefault(); e.stopPropagation(); setScore(s=>s+1); spawn(); }}
            onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); setScore(s=>s+1); spawn(); }}
            style={{ position:'absolute', width:SIZE, height:SIZE, borderRadius:9999, background:'#ddd', cursor:'crosshair',
                     left: pos.left, top: pos.top, boxShadow:'0 0 0 3px rgba(255,255,255,.25) inset' }}
          />
        )}
      </div>

      {!running && (
        <div style={{ display:'flex', flexDirection:'column', gap:10, alignItems:'center', marginTop:12 }}>
          <input placeholder="이름" value={name} onChange={e => setName(e.target.value)} maxLength={20}
                 style={{ padding:'8px 10px', borderRadius:8, border:'1px solid #555', background:'#111', color:'#fff' }} />
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={submitScore} style={{ padding:'8px 12px', borderRadius:8, border:0, background:'#444', color:'#fff', cursor:'pointer' }}>리더보드 등록</button>
            <button onClick={start} style={{ padding:'8px 12px', borderRadius:8, border:0, background:'#444', color:'#fff', cursor:'pointer' }}>다시 시작</button>
          </div>
          {error && <p style={{ color:'#f88' }}>{error}</p>}
        </div>
      )}

      <section style={{ marginTop: 12 }}>
        <h2>리더보드 (Top 10)</h2>
        <ol style={{ listStyle:'none', padding:0, margin:0 }}>
          {board.map((r, i) => (
            <li key={i} style={{ display:'flex', gap:8, alignItems:'center', padding:'6px 0', borderBottom:'1px solid #333' }}>
              <span style={{ width:24, textAlign:'right', opacity:.8 }}>{i + 1}</span>
              <span style={{ flex:1 }}>{r.name}</span>
              <span style={{ fontVariantNumeric:'tabular-nums' }}>{r.score}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
