import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

const WINDOWS = {
  todo_dia: ['00:00:00', '23:59:59'],
  medio_dia: ['08:00:00', '12:00:00'],
  dia_completo: ['08:00:00', '17:30:00'],
  fuera_horario: ['00:00:00', '23:59:59'],
};

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

export default function ExportButton({ fecha, timeRange, skills }) {
  // null = inactivo, 'todos' = reporte completo, 'abandono' = solo sin atencion.
  const [exporting, setExporting] = useState(null);

  const handleExport = async (tipo) => {
    setExporting(tipo);
    try {
      const range = timeRange || 'todo_dia';
      const [hIni, hFin] = WINDOWS[range] || WINDOWS.todo_dia;
      const lineas = skills && skills.length ? skills : ['In_Contingencias'];
      const body = {
        fecha_inicio: `${fecha}T${hIni}`,
        fecha_fin: `${fecha}T${hFin}`,
        time_range: range,
        skills: lineas,
      };
      if (tipo === 'abandono') body.solo_abandono = true;

      // POST JSON al endpoint correcto (el backend expone POST /api/export).
      const response = await fetch(`${API_BASE}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('Error al exportar');

      // El backend manda cuantas filas se exportaron (header expuesto por CORS).
      const totalFilas = Number(response.headers.get('X-Total-Filas') ?? -1);
      if (tipo === 'abandono' && totalFilas === 0) {
        alert('No hay llamadas sin atención (abandono, fuera de horario o queue time out) con el filtro seleccionado.');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const sufijo = lineas.length > 1 ? 'MULTI' : '';
      a.download =
        tipo === 'abandono'
          ? `Solo_Abandono_${fecha}_${range}${sufijo}.xlsx`
          : `Reporte_Abandono_${fecha}_${range}${sufijo}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Error al exportar el reporte');
    } finally {
      setExporting(null);
    }
  };

  const ocupado = exporting !== null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => handleExport('todos')}
        disabled={ocupado}
        className="btn-export"
        title="Exportar a Excel con diseño"
      >
        <DownloadIcon />
        {exporting === 'todos' ? 'Exportando...' : 'Exportar Excel'}
      </button>
      <button
        onClick={() => handleExport('abandono')}
        disabled={ocupado}
        className="btn-abandono"
        title="Exportar los números sin atención del filtro: abandono, fuera de horario (Out of Time IN) y queue time out"
      >
        <AlertIcon />
        {exporting === 'abandono' ? 'Exportando...' : 'Exportar Abandono'}
      </button>
    </div>
  );
}
