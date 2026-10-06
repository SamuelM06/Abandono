import { useState, useEffect, useCallback } from 'react';
import ExportButton from './ExportButton';
import Pagination from './Pagination';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

export default function DetailView() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [timeRange, setTimeRange] = useState('dia_completo');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });
  const [filters, setFilters] = useState({ agent: '', result: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        fecha,
        time_range: timeRange,
        skill: 'In_Contingencias',
        page: page.toString(),
        page_size: pageSize.toString(),
      });

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
  }, [fecha, timeRange, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const filteredCalls = sortedCalls.filter(call => {
    const agentMatch = !filters.agent || (call.agent && call.agent.includes(filters.agent));
    const resultMatch = !filters.result || (call.resultcalldesc && call.resultcalldesc.toLowerCase().includes(filters.result.toLowerCase()));
    return agentMatch && resultMatch;
  });

  const formatNumber = (num) => new Intl.NumberFormat('es-CO').format(num);

  const getResultBadge = (call) => {
    if (call.resultcall === '10164') {
      return <span className="badge-abandono">ABANDONO</span>;
    }
    if (call.resultcall === '16') {
      return <span className="badge-atendida">ATENDIDA</span>;
    }
    return <span className="text-gray-500">{call.resultcalldesc || call.resultcall}</span>;
  };

  const columns = [
    { key: 'fecha', label: 'Fecha', render: (c) => new Date(c.fecha).toLocaleString('es-CO') },
    { key: 'hora', label: 'Hora', render: (c) => new Date(c.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
    { key: 'agent', label: 'Agente', render: (c) => c.agent || '-' },
    { key: 'extension', label: 'Extensión', render: (c) => c.extension || '-' },
    { key: 'skill', label: 'Skill', render: (c) => c.skill },
    { key: 'typecall', label: 'Tipo', render: (c) => c.typecall || '-' },
    { key: 'resultcall', label: 'Resultado', render: getResultBadge },
    { key: 'resultdesc', label: 'Detalle', render: (c) => c.resultdesc || '-' },
    { key: 'timecall', label: 'Duración (s)', render: (c) => c.timecall ? c.timecall.toFixed(1) : '-' },
    { key: 'timequeue', label: 'Cola (s)', render: (c) => c.timequeue ? c.timequeue.toFixed(1) : '-' },
    { key: 'numbercall', label: 'Número', render: (c) => c.numbercall || '-' },
    { key: 'localani', label: 'ANI Local', render: (c) => c.localani || '-' },
  ];

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-raleway font-bold text-2xl text-xuma-gray">Detalle de Llamadas</h2>
          <p className="font-raleway text-gray-500 mt-1">
            Skill: <span className="font-medium text-xuma-blue">In_Contingencias</span> |{" "}
            Total: <span className="font-bold text-xuma-gray">{formatNumber(total)}</span> registros
          </p>
        </div>
        <ExportButton fecha={fecha} timeRange={timeRange} />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2">
                <span className="font-raleway text-sm text-gray-600">Rango:</span>
                <select
                  value={timeRange}
                  onChange={(e) => { setTimeRange(e.target.value); setPage(1); }}
                  className="select-field w-auto"
                >
                  <option value="medio_dia">Medio día (8:00 - 12:00)</option>
                  <option value="dia_completo">Día completo (8:00 - 17:30)</option>
                  <option value="fuera_horario">Fuera de horario (17:30+)</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                <span className="font-raleway text-sm text-gray-600">Fecha:</span>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => { setFecha(e.target.value); setPage(1); }}
                  className="input-field w-auto"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Filtrar por agente..."
                value={filters.agent}
                onChange={(e) => setFilters(prev => ({ ...prev, agent: e.target.value }))}
                className="input-field w-48"
              />
              <input
                type="text"
                placeholder="Filtrar por resultado..."
                value={filters.result}
                onChange={(e) => setFilters(prev => ({ ...prev, result: e.target.value }))}
                className="input-field w-48"
              />
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortConfig.key === col.key && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <td colSpan={columns.length} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="animate-spin w-8 h-8 text-xuma-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <p className="font-raleway text-gray-500">Cargando llamadas...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="font-raleway text-gray-500">No se encontraron llamadas con los filtros actuales</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call) => (
                  <tr key={call.idlog_calls} className={call.resultcall === '10164' ? 'bg-red-50' : ''}>
                    {columns.map((col) => (
                      <td key={col.key}>
                        {col.render(call)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > pageSize && (
          <div className="px-6 py-4 border-t border-gray-100">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(total / pageSize)}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}