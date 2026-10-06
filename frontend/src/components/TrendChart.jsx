import { useMemo, useRef, useState } from 'react';

export default function TrendChart({ data }) {
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null);

  const { points, max } = useMemo(() => {
    if (!data || data.length === 0) return { points: [], max: 1 };
    let acc = 0, accAb = 0, accOk = 0;
    const pts = data.map((d) => {
      acc += d.total; accAb += d.abandono; accOk += d.atendidas;
      return {
        hora: d.hora, total: acc, abandono: accAb, atendidas: accOk,
        hTotal: d.total, hAb: d.abandono, hOk: d.atendidas,
      };
    });
    return { points: pts, max: Math.max(acc, 1) };
  }, [data]);

  if (!points.length) return null;

  const W = 720, H = 196, PAD_L = 36, PAD_B = 24, PAD_T = 18;
  const n = points.length;
  const slot = (W - PAD_L - 12) / n;
  const bw = Math.min(36, slot * 0.58);
  const x = (i) => PAD_L + slot * i + slot / 2;
  const y = (v) => H - PAD_B - (v / max) * (H - PAD_B - PAD_T);
  const line = (key) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p[key])}`).join(' ');
  const area = (key) => `${line(key)} L${x(n - 1)},${H - PAD_B} L${x(0)},${H - PAD_B} Z`;

  const onMove = (e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = W / rect.width;
    const mx = (e.clientX - rect.left) * sx;
    let best = 0, bestD = Infinity;
    points.forEach((_, i) => {
      const d = Math.abs(x(i) - mx);
      if (d < bestD) { bestD = d; best = i; }
    });
    setHover({ i: best, px: (e.clientX - rect.left), py: (e.clientY - rect.top) });
  };

  const hp = hover ? points[hover.i] : null;
  const hpAbPct = hp && hp.hTotal > 0 ? ((hp.hAb / hp.hTotal) * 100).toFixed(1) : '0.0';

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between !py-2.5">
        <h3 className="font-raleway font-bold text-xuma-gray dark:text-white flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-xuma-green-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Tendencia acumulada
        </h3>
        <div className="hidden sm:flex items-center gap-3 font-raleway text-[11px] text-gray-500 dark:text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-xuma-blue dark:bg-xuma-green-light" /> Ingresadas</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Atendidas</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Abandono</span>
        </div>
      </div>
      <div ref={wrapRef} className="px-3 pt-1 pb-2 overflow-x-auto relative" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px]" role="img" aria-label="Tendencia acumulada con barras y lineas">
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={PAD_L} x2={W - 12} y1={y(max * f)} y2={y(max * f)} stroke="currentColor" className="text-gray-200 dark:text-slate-700" strokeDasharray="4 4" />
              <text x={4} y={y(max * f) + 3} fontSize="9" fill="currentColor" className="fill-gray-400">{Math.round(max * f)}</text>
            </g>
          ))}
          <path d={area('total')} fill="#120180" opacity="0.10" className="dark:opacity-20" />
          {points.map((p, i) => (
            <g key={p.hora}>
              <rect
                x={x(i) - bw / 2}
                y={y(p.total)}
                width={bw}
                height={Math.max(2, H - PAD_B - y(p.total))}
                rx="4"
                fill="#120180"
                opacity={hover?.i === i ? 1 : 0.85}
                className="dark:opacity-100"
              />
              <text x={x(i)} y={y(p.total) - 5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#00CD93">
                {p.total}
              </text>
            </g>
          ))}
          <path d={line('atendidas')} fill="none" stroke="#00CD93" strokeWidth="2.5" strokeLinecap="round" />
          <path d={line('abandono')} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 3" />
          {points.map((p, i) => (
            <g key={`dots-${p.hora}`}>
              <circle cx={x(i)} cy={y(p.atendidas)} r={hover?.i === i ? 5 : 3.5} fill="#00CD93" stroke="#fff" strokeWidth="1.5" />
              <circle cx={x(i)} cy={y(p.abandono)} r={hover?.i === i ? 5 : 3.5} fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
              {(i % Math.ceil(n / 8) === 0 || i === n - 1) && (
                <text x={x(i)} y={H - 7} textAnchor="middle" fontSize="10" fill="currentColor" className="fill-gray-500">
                  {p.hora}
                </text>
              )}
            </g>
          ))}
          {hover && (
            <line x1={x(hover.i)} x2={x(hover.i)} y1={PAD_T} y2={H - PAD_B} stroke="#5AE280" strokeWidth="1.5" strokeDasharray="3 3" />
          )}
        </svg>
        {hp && (
          <div
            className="absolute z-20 pointer-events-none bg-[#131a30] dark:bg-black text-white rounded-xl shadow-2xl border border-xuma-green-dark/40 px-4 py-3 font-raleway text-xs min-w-[210px]"
            style={{
              left: Math.min(Math.max(hover.px + 14, 8), (wrapRef.current?.clientWidth || 300) - 225),
              top: Math.max(hover.py - 40, 8),
            }}
          >
            <p className="font-bold text-sm text-xuma-green-light mb-1.5">{hp.hora} — detalle</p>
            <div className="space-y-1">
              <p>📞 Hora: <strong>{hp.hTotal}</strong> (abandono {hpAbPct}%)</p>
              <p>✅ Atendidas hora: <strong>{hp.hOk}</strong></p>
              <p>❌ Abandono hora: <strong>{hp.hAb}</strong></p>
              <hr className="border-white/15 !my-1.5" />
              <p>📊 Acumulado: <strong>{hp.total}</strong></p>
              <p>✅ Acum. atendidas: <strong>{hp.atendidas}</strong></p>
              <p>❌ Acum. abandono: <strong>{hp.abandono}</strong></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
