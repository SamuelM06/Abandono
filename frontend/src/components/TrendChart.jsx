import { useMemo } from 'react';

export default function TrendChart({ data }) {
  const { points, max } = useMemo(() => {
    if (!data || data.length === 0) return { points: [], max: 1 };
    let acc = 0, accAb = 0, accOk = 0;
    const pts = data.map((d) => {
      acc += d.total; accAb += d.abandono; accOk += d.atendidas;
      return { hora: d.hora, total: acc, abandono: accAb, atendidas: accOk };
    });
    return { points: pts, max: Math.max(acc, 1) };
  }, [data]);

  if (!points.length) return null;

  const W = 720, H = 220, PAD = 32;
  const x = (i) => PAD + (i * (W - PAD * 2)) / Math.max(1, points.length - 1);
  const y = (v) => H - PAD - (v / max) * (H - PAD * 2);
  const line = (key) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p[key])}`).join(' ');
  const area = (key) => `${line(key)} L${x(points.length - 1)},${H - PAD} L${x(0)},${H - PAD} Z`;

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div>
          <h3 className="font-raleway font-bold text-xuma-gray dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-xuma-green-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Tendencia acumulada del día
          </h3>
          <p className="font-raleway text-sm text-gray-500 dark:text-slate-400 mt-1">Acumulado por hora: ingresadas, atendidas y abandono</p>
        </div>
        <div className="hidden sm:flex items-center gap-4 font-raleway text-xs text-gray-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-xuma-blue dark:bg-xuma-green-light" /> Ingresadas</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-xuma-green-dark" /> Atendidas</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" /> Abandono</span>
        </div>
      </div>
      <div className="p-4 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]" role="img" aria-label="Tendencia acumulada">
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1={PAD} x2={W - PAD} y1={y(max * f)} y2={y(max * f)} stroke="currentColor" className="text-gray-200 dark:text-slate-700" strokeDasharray="4 4" />
          ))}
          <path d={area('total')} fill="#120180" opacity="0.12" className="dark:opacity-20" />
          <path d={line('total')} fill="none" stroke="#5AE280" strokeWidth="3" strokeLinecap="round" />
          <path d={line('atendidas')} fill="none" stroke="#00CD93" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 0" />
          <path d={line('abandono')} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
          {points.map((p, i) => (
            <g key={p.hora}>
              <circle cx={x(i)} cy={y(p.total)} r="4" fill="#5AE280" stroke="#fff" strokeWidth="1.5" />
              {(i % Math.ceil(points.length / 8) === 0 || i === points.length - 1) && (
                <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="currentColor" className="fill-gray-500">
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
