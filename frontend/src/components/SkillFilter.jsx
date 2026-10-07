import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

const PhoneIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a2 2 0 01.948.684l1.498 4.493a2 2 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a2 2 0 011.21-.502l4.493 1.498a2 2 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

/**
 * Filtro de lineas (skills): una sola linea a la vez.
 * El estado se mantiene como lista porque es lo que espera la API (`skills`).
 */
export default function SkillFilter({ selected, onChange }) {
  const [options, setOptions] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/skills`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setOptions(d.skills || []))
      .catch(() => setError(true));
  }, []);

  const actual = selected[0] || 'In_Contingencias';

  // Radio: al pulsar una linea se queda solo esa.
  const select = (skill) => onChange([skill]);
  const limpiar = () => onChange(['In_Contingencias']);
  const sinFiltro = actual === 'In_Contingencias';

  return (
    <div className="card !p-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <PhoneIcon />
          <span className="font-raleway font-bold text-[15px] text-xuma-gray dark:text-white">Líneas</span>
        </div>

        <div className="flex flex-wrap gap-2 flex-1 items-center">
          {options.map((o) => {
            const activo = actual === o.skill;
            return (
              <button
                key={o.skill}
                onClick={() => select(o.skill)}
                aria-pressed={activo}
                title={`${o.skill} · ${o.typecall} · ${o.total_30d} llamadas en 30 días`}
                className={`filter-chip ${activo ? 'filter-chip-active' : 'filter-chip-inactive'}`}
              >
                {o.label}
                <span className="ml-1 text-[0.7rem] opacity-70">{o.total_30d}</span>
              </button>
            );
          })}
          {!options.length && !error && (
            <span className="font-raleway text-sm text-gray-500 dark:text-slate-400">Cargando líneas...</span>
          )}
          {error && (
            <span className="font-raleway text-sm text-red-600">No se pudieron cargar las líneas</span>
          )}
          {!sinFiltro && (
            <span className="w-px h-6 bg-gray-200 dark:bg-slate-700" aria-hidden="true"></span>
          )}
          {!sinFiltro && (
            <button
              onClick={limpiar}
              aria-label="Limpiar filtro de líneas"
              title="Limpiar filtro de líneas (volver a contingencia)"
              className="filter-chip filter-chip-inactive !px-3 !py-2"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </div>

      <p className="font-raleway text-xs text-gray-500 dark:text-slate-400 mt-2">
        Skill: <span className="font-semibold">{actual}</span>
      </p>
    </div>
  );
}
