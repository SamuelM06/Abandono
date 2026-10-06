import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

const WINDOWS = {
  medio_dia: ['08:00:00', '12:00:00'],
  dia_completo: ['08:00:00', '17:30:00'],
  fuera_horario: ['00:00:00', '23:59:59'],
};

export default function ExportButton({ fecha, timeRange }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const range = timeRange || 'dia_completo';
      const [hIni, hFin] = WINDOWS[range] || WINDOWS.dia_completo;
      const body = {
        fecha_inicio: `${fecha}T${hIni}`,
        fecha_fin: `${fecha}T${hFin}`,
        skill: 'In_Contingencias',
        time_range: range,
      };

      // POST JSON al endpoint correcto (el backend expone POST /api/export).
      const response = await fetch(`${API_BASE}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('Error al exportar');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_Abandono_${fecha}_${range}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Error al exportar el reporte');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="btn-outline"
      title="Exportar a Excel con diseño"
    >
      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {exporting ? 'Exportando...' : 'Exportar Excel'}
    </button>
  );
}
