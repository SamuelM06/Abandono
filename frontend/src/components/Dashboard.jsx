import { useState, useEffect, useCallback, useRef } from 'react';
import KPICard from './KPICard';
import HourlyChart from './HourlyChart';
import TrendChart from './TrendChart';
import FilterChips from './FilterChips';
import EmailPreview from './EmailPreview';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
const REFRESH_SECONDS = 60;

const PhoneIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const RefreshIcon = ({ spinning }) => (
  <svg className={`w-4 h-4 inline mr-1 ${spinning ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export default function Dashboard({ onUpdate, skills }) {
  const [kpis, setKpis] = useState({
    total_ingresadas: 0,
    total_abandono: 0,
    total_atendidas: 0,
    total_unicos: 0,
    total_duplicados: 0,
  });
  const [hourlyData, setHourlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('dia_completo');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [countdown, setCountdown] = useState(REFRESH_SECONDS);
  const [isOwner, setIsOwner] = useState(true);
  const timer = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/ui-config`).then((r) => r.json()).then((d) => setIsOwner(!!d.is_owner)).catch(() => setIsOwner(true));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // La fecha, el rango y las lineas SIEMPRE salen de lo seleccionado en el front.
      const params = new URLSearchParams({ fecha, time_range: timeRange });
      skills.forEach((s) => params.append('skills', s));

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
  }, [fecha, timeRange, skills, onUpdate]);

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
  const pct = (v) => (total > 0 ? ((v / total) * 100).toFixed(1) : '0.0');

  return (
    <div className="space-y-4 animate-slide-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-raleway font-bold text-xl text-xuma-gray dark:text-white">Dashboard Contingencia</h2>
          <p className="font-raleway text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Skill: <span className="font-medium text-xuma-blue dark:text-xuma-green-light">{skills.join(' · ')}</span> | Fecha:{" "}
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="input-field w-auto inline-block font-raleway !py-1.5"
            />
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isOwner && <EmailPreview fecha={fecha} skills={skills} />}
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn-secondary !py-2.5 !px-4 !text-[0.85rem]"
            title="Se actualiza solo cada 60 segundos — clic para actualizar ya"
          >
            <RefreshIcon spinning={loading} />
            {loading ? 'Actualizando...' : `Actualizar (${countdown}s)`}
          </button>
        </div>
      </div>

      <FilterChips active={timeRange} onChange={setTimeRange} />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <KPICard
          title="Ingresadas"
          value={formatNumber(kpis.total_ingresadas)}
          icon={<PhoneIcon />}
          subtitle="100% del total"
          share={100}
        />
        <KPICard
          title="Abandono"
          value={formatNumber(kpis.total_abandono)}
          subtitle={`${pct(kpis.total_abandono)}% del total`}
          icon={<AlertIcon />}
          alert
          share={Number(pct(kpis.total_abandono))}
        />
        <KPICard
          title="Atendidas"
          value={formatNumber(kpis.total_atendidas)}
          subtitle={`${pct(kpis.total_atendidas)}% del total`}
          icon={<CheckIcon />}
          success
          share={Number(pct(kpis.total_atendidas))}
        />
        <KPICard
          title="Únicos"
          value={formatNumber(kpis.total_unicos)}
          subtitle="1er registro por número"
          icon={<UsersIcon />}
          info
          share={Number(pct(kpis.total_unicos))}
        />
        <KPICard
          title="Duplicados"
          value={formatNumber(kpis.total_duplicados)}
          subtitle="Rellamadas mismo número"
          icon={<CopyIcon />}
          warn
          share={Number(pct(kpis.total_duplicados))}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <TrendChart data={hourlyData} />
        <HourlyChart data={hourlyData} loading={loading} />
      </div>
    </div>
  );
}
