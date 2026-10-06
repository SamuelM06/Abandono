import { useState, useEffect, useCallback, useRef } from 'react';
import KPICard from './KPICard';
import HourlyChart from './HourlyChart';
import TrendChart from './TrendChart';
import FilterChips from './FilterChips';
import ExportButton from './ExportButton';
import EmailPreview from './EmailPreview';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
const REFRESH_SECONDS = 60;

const PhoneIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const RefreshIcon = ({ spinning }) => (
  <svg className={`w-5 h-5 inline mr-1 ${spinning ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
  const [countdown, setCountdown] = useState(REFRESH_SECONDS);
  const timer = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
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
      setCountdown(REFRESH_SECONDS);
    }
  }, [fecha, timeRange, onUpdate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // El mismo botón se auto-actualiza cada minuto (cuenta regresiva visible).
  useEffect(() => {
    timer.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          fetchData();
          return REFRESH_SECONDS;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer.current);
  }, [fetchData]);

  const formatNumber = (num) => new Intl.NumberFormat('es-CO').format(num);
  const total = kpis.total_ingresadas || 0;
  const abandonoPct = total > 0 ? (kpis.total_abandono / total) * 100 : 0;
  const atendidasPct = total > 0 ? (kpis.total_atendidas / total) * 100 : 0;

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-raleway font-bold text-2xl text-xuma-gray dark:text-white">Dashboard Contingencia</h2>
          <p className="font-raleway text-gray-500 dark:text-slate-400 mt-1">
            Skill: <span className="font-medium text-xuma-blue dark:text-xuma-green-light">In_Contingencias</span> | Fecha:{" "}
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="input-field w-auto inline-block font-raleway"
            />
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ExportButton fecha={fecha} timeRange={timeRange} />
          <EmailPreview fecha={fecha} />
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn-secondary"
            title="Se actualiza solo cada 60 segundos — clic para actualizar ya"
          >
            <RefreshIcon spinning={loading} />
            {loading ? 'Actualizando...' : `Actualizar (${countdown}s)`}
          </button>
        </div>
      </div>

      <FilterChips active={timeRange} onChange={setTimeRange} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Total llamadas ingresadas"
          value={formatNumber(kpis.total_ingresadas)}
          icon={<PhoneIcon />}
          color="bg-xuma-blue"
          textColor="text-white"
          subtitle="100% del total"
          share={100}
        />
        <KPICard
          title="Total llamadas abandono"
          value={formatNumber(kpis.total_abandono)}
          subtitle={`${abandonoPct.toFixed(1)}% del total`}
          icon={<AlertIcon />}
          color="bg-red-500"
          textColor="text-white"
          alert
          share={abandonoPct}
        />
        <KPICard
          title="Total llamadas atendidas"
          value={formatNumber(kpis.total_atendidas)}
          subtitle={`${atendidasPct.toFixed(1)}% del total`}
          icon={<CheckIcon />}
          color="bg-xuma-green-dark"
          textColor="text-white"
          success
          share={atendidasPct}
        />
      </div>

      <TrendChart data={hourlyData} />
      <HourlyChart data={hourlyData} loading={loading} />
    </div>
  );
}
