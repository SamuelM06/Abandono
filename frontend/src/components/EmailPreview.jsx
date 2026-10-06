import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

export default function EmailPreview({ fecha }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  const loadPreview = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/email/preview?fecha=${fecha}&skill=In_Contingencias`);
      if (!res.ok) throw new Error('No se pudo cargar la vista previa');
      setPreview(await res.json());
      setOpen(true);
    } catch (e) {
      setError('No se pudo cargar la vista previa del correo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={loadPreview} disabled={loading} className="btn-preview" title="Ver cómo llegará el correo de las 17:00 sin enviarlo">
        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {loading ? 'Cargando...' : 'Vista previa correo'}
      </button>
      {error && <span className="font-raleway text-sm text-red-600">{error}</span>}
      {open && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="card-header flex items-center justify-between sticky top-0">
              <div>
                <h3 className="font-raleway font-bold text-xuma-gray">Vista previa — correo automático 17:00</h3>
                <p className="font-raleway text-sm text-gray-500">No se envía nada, solo revisión.</p>
              </div>
              <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded border border-gray-300 font-raleway text-sm">Cerrar</button>
            </div>
            <div className="p-6 space-y-3">
              <p className="font-raleway text-sm"><strong>Asunto:</strong> {preview.subject}</p>
              <p className="font-raleway text-sm"><strong>Para:</strong> {preview.to || '(configurar EMAIL_TO_JEFA)'}</p>
              <p className="font-raleway text-sm"><strong>CC:</strong> {preview.cc || '(configurar EMAIL_TO_COORD)'}</p>
              <p className="font-raleway text-sm"><strong>Adjunto:</strong> {preview.filename}</p>
              <p className="font-raleway text-sm">
                <strong>KPIs:</strong> Ingresadas {preview.kpis.total_ingresadas} · Abandono {preview.kpis.total_abandono} · Atendidas {preview.kpis.total_atendidas}
              </p>
              <div className="border rounded-lg overflow-hidden">
                <iframe title="preview-email" srcDoc={preview.body_html} className="w-full" style={{ height: '480px' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
