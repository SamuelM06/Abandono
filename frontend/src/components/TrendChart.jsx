import { useMemo } from 'react';

export default function TrendChart({ data }) {
  const { points, max } = useMemo(() => {
    if (!data || data.length === 0) return { points: [], max: 1 };
    let acc = 0, accAb = 0, accOk = 0;
    const pts = data.map((d) => {
      acc += d.total; accAb += d.abandono; accOk += d.atendidas;
      return { hora: d.hora, total: acc, abandono: accAb, atendidas: accOk, horaTotal: d.total };
    });
    return { points: pts, max: Math.max(acc, 1) };
  }, [data]);

  if (!points.length) return null;

  const W = 720, H = 168, PAD_L = 36, PAD_B = 24, PAD_T = 20;
  const n = points.length;
  const slot = (W - PAD_L - 12) / n;
  const bw = Math.min(34, slot * 0.52);
  const x = (i) => PAD_L + slot * i + slot / 2;
  const y = (v) => H - PAD_B - (v / max) * (H - PAD_B - PAD_T);
  const line = (key) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p[key])}`).join(' ');
  const area = (key) => `${line(key)} L${x(n - 1)},${H - PAD_B} L${x(0)},${H - PAD_B} Z`;

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between !py-3">
        <div>
          <h3 className="font-raleway font-bold text-xuma-gray dark:text-white flex items-center gap-2 text-[15px]">
            <svg className="w-5 h-5 text-xuma-green-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Tendencia acumulada del día
          </h3>
        </div>
        <div className="hidden sm:flex items-center gap-4 font-raleway text-xs text-gray-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-xuma-blue dark:bg-xuma-green-light" /> Ingresadas (barra)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-400" /> Atendidas</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" /> Abandono</span>
        </div>
      </div>
      <div className="px-3 pt-1 pb-2 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]" role="img" aria-label="Tendencia acumulada con barras y lineas">
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={PAD_L} x2={W - 12} y1={y(max * f)} y2={y(max * f)} stroke="currentColor" className="text-gray-200 dark:text-slate-700" strokeDasharray="4 4" />
              <text x={4} y={y(max * f) + 4} fontSize="10" fill="currentColor" className="fill-gray-400">{Math.round(max * f)}</text>
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
                opacity="0.85"
                className="dark:opacity-100"
              />
              <text x={x(i)} y={y(p.total) - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="#00CD93">
                {p.total}
              </text>
            </g>
          ))}
          <path d={line('atendidas')} fill="none" stroke="#00CD93" strokeWidth="2.5" strokeLinecap="round" />
          <path d={line('abandono')} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 3" />
          {points.map((p, i) => (
            <g key={`dots-${p.hora}`}>
              <circle cx={x(i)} cy={y(p.atendidas)} r="3.5" fill="#00CD93" stroke="#fff" strokeWidth="1.5" />
              <circle cx={x(i)} cy={y(p.abandono)} r="3.5" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
              {(i % Math.ceil(n / 8) === 0 || i === n - 1) && (
                <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="currentColor" className="fill-gray-500">
                  {p.hora}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
