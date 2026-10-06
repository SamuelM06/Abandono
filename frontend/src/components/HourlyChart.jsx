import { useMemo } from 'react';

export default function HourlyChart({ data, loading }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const maxTotal = Math.max(...data.map(d => d.total), 1);
    return data.map(d => ({
      ...d,
      totalPct: (d.total / maxTotal) * 100,
      abandonoPct: (d.abandono / maxTotal) * 100,
      atendidasPct: (d.atendidas / maxTotal) * 100,
    }));
  }, [data]);

  if (loading && !data.length) {
    return (
      <div className="card animate-pulse">
        <div className="card-header">
          <h3 className="font-raleway font-semibold text-xuma-gray dark:text-white">Llamadas por Hora</h3>
        </div>
        <div className="p-6 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-slate-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="font-raleway font-semibold text-xuma-gray dark:text-white">Llamadas por Hora</h3>
        </div>
        <div className="p-12 text-center text-gray-500 dark:text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-raleway">No hay datos para el rango seleccionado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header !py-3">
        <h3 className="font-raleway font-semibold text-xuma-gray dark:text-white text-[15px]">Distribución por Hora</h3>
        <p className="font-raleway text-xs text-gray-500 dark:text-slate-400 mt-0.5">Barras apiladas: Atendidas (verde) + Abandono (rojo) = Total</p>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-2.5">
          {chartData.map((item, index) => (
            <div key={item.hora} className="animate-slide-in stagger-1" style={{ animationDelay: `${index * 0.05}s` }}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-raleway font-medium text-xs text-gray-700 dark:text-slate-300 w-12">{item.hora}</span>
                <div className="flex-1 h-6 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden relative">
                  {item.atendidas > 0 && (
                    <div
                      className="absolute left-0 top-0 h-full bg-xuma-green-dark rounded-l-full transition-all duration-500"
                      style={{ width: `${item.atendidasPct}%` }}
                      title={`Atendidas: ${item.atendidas}`}
                    />
                  )}
                  {item.abandono > 0 && (
                    <div
                      className="absolute top-0 h-full bg-red-500 rounded-r-full transition-all duration-500"
                      style={{
                        left: `${item.atendidasPct}%`,
                        width: `${item.abandonoPct}%`,
                      }}
                      title={`Abandono: ${item.abandono}`}
                    />
                  )}
                  {item.total === 0 && (
                    <div className="absolute inset-0 bg-gray-200" />
                  )}
                </div>
                <span className="font-raleway font-bold text-xs text-xuma-gray dark:text-white w-10 text-right">{item.total}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-slate-400 ml-12">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-xuma-green-dark" />
                  Atendidas: {item.atendidas}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Abandono: {item.abandono}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}