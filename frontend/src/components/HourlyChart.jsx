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
          <h3 className="font-raleway font-semibold text-xuma-gray">Llamadas por Hora</h3>
        </div>
        <div className="p-6 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="font-raleway font-semibold text-xuma-gray">Llamadas por Hora</h3>
        </div>
        <div className="p-12 text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-raleway">No hay datos para el rango seleccionado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="font-raleway font-semibold text-xuma-gray">Distribución por Hora</h3>
        <p className="font-raleway text-sm text-gray-500 mt-1">Barras apiladas: Atendidas (verde) + Abandono (rojo) = Total</p>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {chartData.map((item, index) => (
            <div key={item.hora} className="animate-slide-in stagger-1" style={{ animationDelay: `${index * 0.05}s` }}>
              <div className="flex items-center gap-3 mb-1">
                <span className="font-raleway font-medium text-sm text-gray-700 w-16">{item.hora}</span>
                <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden relative">
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
                <span className="font-raleway font-bold text-sm text-xuma-gray w-16 text-right">{item.total}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 ml-16">
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