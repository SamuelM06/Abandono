import { useState, useEffect, useCallback, useMemo } from 'react';
import ExportButton from './ExportButton';
import Pagination from './Pagination';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
const PAGE_SIZE = 10;

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const FilterIcon = () => (
  <svg className="w-5 h-5 text-xuma-green-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const TableIcon = () => (
  <svg className="w-5 h-5 text-xuma-blue dark:text-xuma-green-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

export default function DetailView({ skills }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [timeRange, setTimeRange] = useState('todo_dia');
  const [fecha, setFecha] = useState(todayStr);
  const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });
  const [filters, setFilters] = useState({ agent: '', result: '' });
  const [options, setOptions] = useState({ asesores: [], resultados: [] });

  const linesActivas = useMemo(
    () => (skills && skills.length ? skills : ['In_Contingencias']),
    [skills]
  );

  // Items reales desde BD para los selects (se recargan con fecha/rango/lineas).
  useEffect(() => {
    const params = new URLSearchParams({ fecha, time_range: timeRange });
    linesActivas.forEach((s) => params.append('skills', s));
    fetch(`${API_BASE}/filtros?${params}`)
      .then((r) => r.json())
      .then((d) => setOptions({ asesores: d.asesores || [], resultados: d.resultados || [] }))
      .catch(() => setOptions({ asesores: [], resultados: [] }));
  }, [fecha, timeRange, linesActivas]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        fecha,
        time_range: timeRange,
        page: page.toString(),
        page_size: PAGE_SIZE.toString(),
      });
      linesActivas.forEach((s) => params.append('skills', s));

      const response = await fetch(`${API_BASE}/calls?${params}`);
      if (!response.ok) throw new Error('Error al cargar datos');

      const data = await response.json();
      setCalls(data.calls || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching calls:', error);
    } finally {
      setLoading(false);
    }
  }, [fecha, timeRange, page, linesActivas]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const goToday = () => {
    setFecha(todayStr());
    setPage(1);
  };

  const clearFilters = () => {
    setFecha(todayStr());
    setTimeRange('todo_dia');
    setFilters({ agent: '', result: '' });
    setPage(1);
  };

  const weekday = (() => {
    try {
      return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long' });
    } catch {
      return '';
    }
  })();

  const hasActiveFilters = fecha !== todayStr() || timeRange !== 'todo_dia' || filters.agent || filters.result;

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedCalls = [...calls].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // El backend ya filtra por fecha/rango; los selects filtran en cliente.
  const filteredCalls = sortedCalls.filter(call => {
    const agentMatch = !filters.agent || call.agent === filters.agent;
    const resultMatch = !filters.result || call.resultdesc === filters.result;
    return agentMatch && resultMatch;
  });

  const formatNumber = (num) => new Intl.NumberFormat('es-CO').format(num);

  const getResultBadge = (call) => {
    const detalle = (call.resultdesc || '').trim();
    if (call.resultcall === '10164') {
      return (
        <span className="badge-abandono">
          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          ABANDONO
        </span>
      );
    }
    // Llamo fuera de horario: nadie contesto, hay que devolver la llamada.
    if (detalle === 'Out of Time IN') {
      return <span className="badge-fuera-horario">FUERA DE HORARIO</span>;
    }
    if (call.resultcall === '10163') {
      return <span className="badge-queue-timeout">QUEUE TIME OUT</span>;
    }
    if (call.resultcall === '16') {
      return (
        <span className="badge-atendida">
          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          ATENDIDA
        </span>
      );
    }
    return <span className="text-gray-500 dark:text-slate-400 font-raleway text-xs">{call.resultcalldesc || call.resultcall}</span>;
  };

  const columns = [
    { key: 'fecha', label: 'Fecha', render: (c) => new Date(c.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }) },
    { key: 'hora', label: 'Hora', render: (c) => new Date(c.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) },
    { key: 'asesor', label: 'Nombre asesor', render: (c) => c.asesor || '—', wrap: true },
    { key: 'agent', label: 'Documento', render: (c) => c.agent || '—' },
    { key: 'resultcall', label: 'Resultado', render: getResultBadge },
    { key: 'resultdesc', label: 'Detalle', render: (c) => c.resultdesc || '—', wrap: true },
    { key: 'timecall', label: 'Dur (s)', render: (c) => c.timecall ? c.timecall.toFixed(0) : '—' },
    { key: 'timequeue', label: 'Cola (s)', render: (c) => c.timequeue ? c.timequeue.toFixed(0) : '—' },
    { key: 'numbercall', label: 'Número', render: (c) => c.numbercall || '—' },
  ];

  return (
    <div className="space-y-4 animate-slide-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-raleway font-bold text-xl text-xuma-gray dark:text-white">Detalle de llamadas</h2>
          <p className="font-raleway text-sm text-gray-500 dark:text-slate-400 mt-0.5 capitalize">
            {weekday} · {linesActivas.length} línea{linesActivas.length > 1 ? 's' : ''} · Total:{" "}
            <span className="font-bold text-xuma-gray dark:text-white">{formatNumber(total)}</span> registros
          </p>
        </div>
        <ExportButton fecha={fecha} timeRange={timeRange} skills={skills} />
      </div>

      <div className="card">
        <div className="card-header !py-3">
          <h3 className="font-raleway font-bold text-xuma-gray dark:text-white flex items-center gap-2 text-[15px]">
            <FilterIcon /> Filtros de búsqueda
          </h3>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-x-5 gap-y-4 items-end">
          <label className="flex flex-col gap-1.5">
            <span className="filter-label">📅 Fecha</span>
            <div className="flex gap-2">
              <input
                type="date"
                value={fecha}
                onChange={(e) => { setFecha(e.target.value); setPage(1); }}
                className="input-field"
              />
              <button onClick={goToday} className="btn-preview !px-3 shrink-0" title="Filtrar automáticamente los registros de hoy">
                Hoy
              </button>
            </div>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="filter-label">⏰ Rango horario</span>
            <select
              value={timeRange}
              onChange={(e) => { setTimeRange(e.target.value); setPage(1); }}
              className="select-field"
            >
              <option value="todo_dia">Todo el día (00:00 - 23:59)</option>
              <option value="medio_dia">Medio día (8:00 - 12:00)</option>
              <option value="dia_completo">Día completo (8:00 - 17:30)</option>
              <option value="fuera_horario">Fuera de horario</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="filter-label">🧑 Asesor</span>
            <select
              value={filters.agent}
              onChange={(e) => setFilters(prev => ({ ...prev, agent: e.target.value }))}
              className="select-field"
            >
              <option value="">Todos los asesores</option>
              {options.asesores.map((a) => (
                <option key={a.agent} value={a.agent}>{a.asesor}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="filter-label">📞 Resultado</span>
            <select
              value={filters.result}
              onChange={(e) => setFilters(prev => ({ ...prev, result: e.target.value }))}
              className="select-field"
            >
              <option value="">Todos los resultados</option>
              {options.resultados.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="filter-label">📋 Vista</span>
            <div className="input-field !bg-gray-50 dark:!bg-slate-800/60 text-center font-semibold">
              {PAGE_SIZE} por página
            </div>
          </div>
          {hasActiveFilters && (
            <label className="flex flex-col gap-1.5">
              <span className="filter-label">&nbsp;</span>
              <button onClick={clearFilters} className="btn-secondary !py-2.5 !px-4 !text-[0.85rem]" title="Limpiar todos los filtros">
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpiar filtros
              </button>
            </label>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header !py-3 flex items-center justify-between">
          <h3 className="font-raleway font-bold text-xuma-gray dark:text-white flex items-center gap-2 text-[15px]">
            <TableIcon /> Registros de hoy
          </h3>
          <span className="font-raleway text-xs text-gray-500 dark:text-slate-400">
            Página {page} de {Math.max(1, Math.ceil(total / PAGE_SIZE))}
          </span>
        </div>

        <div className="overflow-x-hidden">
          <table className="data-table text-center w-full">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="cursor-pointer select-none !text-center whitespace-nowrap !px-2 !py-2.5 !text-xs"
                  >
                    <div className="flex items-center justify-center gap-1">
                      {col.label}
                      {sortConfig.key === col.key && (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortConfig.direction === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                        </svg>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-10">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="animate-spin w-8 h-8 text-xuma-green-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <p className="font-raleway text-gray-500 dark:text-slate-400 text-sm">Cargando llamadas...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-10">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="w-12 h-12 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="font-raleway text-gray-500 dark:text-slate-400 text-sm">No se encontraron llamadas con los filtros actuales</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call) => (
                  <tr
                    key={call.idlog_calls}
                    className={
                      call.resultcall === '10164'
                        ? 'bg-red-50 dark:bg-red-950/30'
                        : (call.resultdesc || '').trim() === 'Out of Time IN'
                          ? 'bg-orange-50 dark:bg-orange-950/25'
                          : ''
                    }
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={`text-center !px-2 !py-2 !text-xs ${col.wrap ? 'whitespace-normal min-w-[140px]' : 'whitespace-nowrap'}`}>
                        {col.render(call)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-gray-100 dark:border-slate-700">
          <Pagination
            currentPage={page}
            totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}
