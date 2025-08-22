export default function Home(){
  return (
    <main style={{maxWidth: 900, margin: '0 auto', padding: 24, color: '#eee'}}>
      <h1 style={{margin: '8px 0 16px'}}>웹게임 모음집</h1>
      <p style={{opacity:.9, marginBottom: 16}}>원하는 게임을 선택하세요.</p>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16}}>
        <a href="/games/reaction" style={{display:'block', padding:'16px', borderRadius:12, background:'#222', color:'#fff', textDecoration:'none'}}>
          <h3 style={{marginTop:0}}>반응속도 테스트</h3>
          <p style={{opacity:.8}}>신호에 반응해 클릭! 기록은 낮을수록 좋습니다.</p>
        </a>
        <a href="/games/aim" style={{display:'block', padding:'16px', borderRadius:12, background:'#222', color:'#fff', textDecoration:'none'}}>
          <h3 style={{marginTop:0}}>AIM 훈련 (30초)</h3>
          <p style={{opacity:.8}}>원형 타겟을 30초간 최대한 많이 맞히세요.</p>
        </a>
      </div>
    </main>
  );
}
