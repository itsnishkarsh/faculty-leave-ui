export function BrandLoader({ label = "Preparing your workspace" }: { label?: string }) {
  return (
    <main className="brand-loader" role="status" aria-live="polite" aria-label={label}>
      <div className="brand-loader__content">
        <svg className="brand-loader__emblem" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="94" fill="#fff" stroke="#26749a" strokeWidth="3" />
          <circle cx="100" cy="100" r="78" fill="#fbfaf5" stroke="#39a6a5" strokeWidth="2" />
          <g className="brand-loader__sun-group">
            <g className="brand-loader__sun-rays" stroke="#d4ac43" strokeWidth="4" strokeLinecap="round">
              <path d="M100 25v10M77 31l5 9M123 31l-5 9M60 46l9 5M140 46l-9 5" />
            </g>
            <circle className="brand-loader__sun" cx="100" cy="54" r="20" fill="#e1bd59" />
          </g>
          <g className="brand-loader__palm">
            <path d="M46 115c5 13 9 23 9 38" fill="none" stroke="#8d633e" strokeWidth="5" strokeLinecap="round" />
            <path d="M54 119c-12-14-23-17-29-15 7 3 12 8 15 14-9-7-17-7-22-4 9 2 15 7 20 13-10-3-17 0-20 4 12-1 22 2 31 7M54 118c-3-17 1-27 7-31-2 8-1 14 2 20 0-11 6-17 11-19-3 9-2 17 0 24 4-9 11-12 16-11-8 7-12 16-14 27" fill="#53a55c" />
          </g>
          <path d="M69 91l31-13 31 13-31 13z" fill="#174f78" />
          <path d="M79 96v15c12 9 30 9 42 0V96l-21 9z" fill="#287fa2" />
          <path d="M131 92v20" stroke="#174f78" strokeWidth="3" />
          <circle cx="131" cy="114" r="3" fill="#d4ac43" />
          <g className="brand-loader__waves" fill="none" strokeLinecap="round">
            <path d="M45 137c14-10 25-10 39 0s25 10 39 0 23-10 34-2" stroke="#36a7a6" strokeWidth="7" />
            <path d="M43 149c15-8 26-8 40 0s26 8 40 0 23-8 34-2" stroke="#26749a" strokeWidth="5" />
          </g>
          <path d="M56 163h88" stroke="#d4ac43" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p className="brand-loader__eyebrow">EDULEAVE PORTAL</p>
        <p className="brand-loader__label">{label}<span className="brand-loader__ellipsis" aria-hidden="true">…</span></p>
        <div className="brand-loader__progress" aria-hidden="true"><span /></div>
      </div>
    </main>
  );
}
