import '../styles/globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="google-adsense-account" content="ca-pub-3161007624993883" />
      </head>
      <body>
        <nav style={{display:'flex',gap:12,padding:'12px 16px',borderBottom:'1px solid #222'}}>
          <a className="muted" href="/">홈</a>
          <a className="muted" href="/games/reaction">반응속도</a>
          <a className="muted" href="/games/aim">AIM</a>
                <a className="muted" href="/games/ladder">사다리타기</a>
        </nav>
        <div className="container">{children}</div>
      </body>
        
      
    </htm
  );
}
