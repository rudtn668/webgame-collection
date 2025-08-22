'use client';
export const metadata = {
  title: '반응속도 테스트',
  description: '신호에 반응해 빠르게 클릭! 낮은 ms일수록 더 좋은 기록입니다.',
  alternates: { canonical: '/games/reaction' },
  openGraph: { title: '반응속도 테스트', description: '낮은 ms가 더 좋은 기록입니다.', url: '/games/reaction' },
};

import { useEffect, useRef, useState } from 'react';
type Row = { name: string; score: number };

function msFmt(ms: number) { return `${ms.toFixed(0)} ms`; }
function newRunId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return (crypto as any).randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function Page() {
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'ready' | 'done'>('idle');
  const [startAt, setStartAt] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [board, setBoard] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const t = useRef<any>(null);
  const [runId, setRunId] = useState<string>('');

  async function fetchLeaderboard() {
    try {
      const r = await fetch(`/api/leaderboard?game=reaction&limit=10`, { cache: 'no-store' });
      const ct = r.headers.get('content-type') || '';
      if (ct.includes('application/json')) return await r.json();
      const txt = await r.text(); console.error('leaderboard non-JSON', txt); return [];
    } catch (e) { console.error('leaderboard fetch error', e); return []; }
  }

  async function submitScore() {
    try {
      if (!name.trim() || !result) { setError('이름 또는 결과가 없습니다.'); return; }
      const r = await fetch(`/api/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'reaction', name: name.trim(), score: result, runId }),
      });
      const ct = r.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await r.json() : { ok:false, error:'NON_JSON' };
      if (!r.ok || (data as any)?.ok === false) {
        setError((data as any)?.error || '제출 실패');
      } else {
        setError(null);
        setBoard(await fetchLeaderboard());
      }
    } catch (e: any) {
      console.error('submit error', e);
      setError(e?.message || '클라이언트 예외');
    }
  }

  useEffect(() => { setRunId(newRunId()); fetchLeaderboard().then(setBoard).catch(()=>{}); }, []);

  function start() {
    setResult(null); setError(null); setPhase('waiting');
    const d = 800 + Math.random() * 1700;
    t.current = setTimeout(() => { setPhase('ready'); setStartAt(performance.now()); }, d);
  }
  function click() {
    if (phase === 'waiting') { clearTimeout(t.current); setPhase('idle'); setError('성급했어요! 초록색으로 바뀐 후 클릭하세요.'); return; }
    if (phase === 'ready') { const e = performance.now() - startAt; setResult(e); setPhase('done'); }
  }
  function restart() { setRunId(newRunId()); setResult(null); setError(null); setPhase('idle'); }

  return (
    <main className="container">
      <a className="muted" href="/">← 홈</a>
      <h1 className="title">반응속도 테스트</h1>
      <div className="hud"><div>상태: <strong>{phase}</strong></div><div>결과: <strong>{result ? msFmt(result) : '-'}</strong></div></div>
      <div className={`arena ${phase}`} onClick={click} role="button" aria-label="게임 영역">
        {phase === 'idle' && <button className="primary" onClick={start}>시작</button>}
        {phase === 'waiting' && <span>빨간색 상태, 기다리세요…</span>}
        {phase === 'ready' && <span>지금 클릭!</span>}
        {phase === 'done' && (
          <div className="submitBox">
            <div className="result">{result ? msFmt(result) : '-'}</div>
            <input placeholder="이름" value={name} onChange={e => setName(e.target.value)} maxLength={20} />
            <div className="row">
              <button onClick={submitScore}>리더보드 등록</button>
              <button onClick={restart}>다시 시작</button>
            </div>
            {error && <p className="error">{error}</p>}
          </div>
        )}
      </div>
      <section>
        <h2>리더보드 (Top 10)</h2>
        <ol className="board">{board.map((r,i)=>(
          <li key={i}><span className="rank">{i+1}</span> <span className="nm">{r.name}</span> <span className="sc">{msFmt(r.score)}</span></li>
        ))}</ol>
      </section>
      <style jsx>{`
        .container{max-width:800px;margin:0 auto;padding:24px;color:#eee}.title{margin:8px 0 16px}.muted{color:#aaa;text-decoration:none}
        .hud{display:flex;gap:16px;margin-bottom:12px;opacity:.9}.arena{display:flex;align-items:center;justify-content:center;height:320px;border-radius:12px;user-select:none}
        .arena.idle{background:#222}.arena.waiting{background:#7a1f1f}.arena.ready{background:#1f7a2f}.arena.done{background:#2b2b2b}
        .primary{padding:10px 16px;border-radius:10px;border:0;background:#444;color:#fff;font-weight:700}
        .submitBox{display:flex;flex-direction:column;gap:10px;align-items:center}.submitBox input{padding:8px 10px;border-radius:8px;border:1px solid #555;background:#111;color:#fff}
        .row{display:flex;gap:8px}.error{color:#f88}.board{list-style:none;padding:0;margin:0}
        .board li{display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #333}.rank{width:24px;text-align:right;opacity:.8}.nm{flex:1}.sc{font-variant-numeric:tabular-nums}
      `}</style>
    </main>
  );
}
