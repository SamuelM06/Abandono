import { useState, useEffect, useCallback } from 'react';
import KPICard from './KPICard';
import HourlyChart from './HourlyChart';
import FilterChips from './FilterChips';
import ExportButton from './ExportButton';
import EmailPreview from './EmailPreview';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

const PhoneIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-5 h-5 inline mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

export default function Dashboard({ onUpdate }) {
  const [kpis, setKpis] = useState({
    total_ingresadas: 0,
    total_abandono: 0,
    total_atendidas: 0,
  });
  const [hourlyData, setHourlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('dia_completo');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // La fecha y el rango SIEMPRE salen de lo seleccionado en el front (nada hardcodeado).
      const params = new URLSearchParams({ fecha, time_range: timeRange });

      const [kpisRes, hourlyRes] = await Promise.all([
        fetch(`${API_BASE}/kpis?${params}`),
        fetch(`${API_BASE}/hourly-stats?${params}`),
      ]);

      if (kpisRes.ok) {
        const data = await kpisRes.json();
        setKpis(data);
      }
      if (hourlyRes.ok) {
        const data = await hourlyRes.json();
        setHourlyData(data.data || []);
      }

      if (onUpdate) {
        onUpdate(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [fecha, timeRange, onUpdate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };

  const handleFechaChange = (newFecha) => {
    setFecha(newFecha);
  };

  const formatNumber = (num) => new Intl.NumberFormat('es-CO').format(num);

  const abandonoPercent = kpis.total_ingresadas > 0
    ? ((kpis.total_abandono / kpis.total_ingresadas) * 100).toFixed(1)
    : 0;

  const atendidasPercent = kpis.total_ingresadas > 0
    ? ((kpis.total_atendidas / kpis.total_ingresadas) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-raleway font-bold text-2xl text-xuma-gray">Dashboard Contingencia</h2>
          <p className="font-raleway text-gray-500 mt-1">
            Skill: <span className="font-medium text-xuma-blue">In_Contingencias</span> | Fecha:{" "}
            <input
              type="date"
              value={fecha}
              onChange={(e) => handleFechaChange(e.target.value)}
              className="input-field w-auto inline-block font-raleway"
            />
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ExportButton fecha={fecha} timeRange={timeRange} />
          <EmailPreview fecha={fecha} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-xuma-blue border-gray-300 rounded focus:ring-xuma-blue"
            />
            <span className="font-raleway text-sm text-gray-600">Auto-actualizar (1 min)</span>
          </label>
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn-secondary"
          >
            <RefreshIcon />
            Actualizar
          </button>
        </div>
      </div>

      <FilterChips active={timeRange} onChange={handleTimeRangeChange} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="TOTAL LLAMADAS INGRESADAS"
          value={formatNumber(kpis.total_ingresadas)}
          icon={<PhoneIcon />}
          color="bg-xuma-blue"
          textColor="text-white"
          subtitle={`100% del total`}
        />
        <KPICard
          title="TOTAL LLAMADAS ABANDONO"
          value={formatNumber(kpis.total_abandono)}
          subtitle={`${abandonoPercent}% del total`}
          icon={<AlertIcon />}
          color="bg-red-500"
          textColor="text-white"
          alert
        />
        <KPICard
          title="TOTAL LLAMADAS ATENDIDAS"
          value={formatNumber(kpis.total_atendidas)}
          subtitle={`${atendidasPercent}% del total`}
          icon={<CheckIcon />}
          color="bg-xuma-green-dark"
          textColor="text-white"
          success
        />
      </div>

      <HourlyChart data={hourlyData} loading={loading} />
    </div>
  );
}