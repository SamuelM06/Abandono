import { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import DetailView from './components/DetailView';
import SkillFilter from './components/SkillFilter';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

function App() {
  const [view, setView] = useState('dashboard');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  // Tema oscuro por defecto
  const [theme, setTheme] = useState(() => localStorage.getItem('abandono-theme') || 'dark');
  // Lineas seleccionadas: se comparte entre Dashboard y Detalle para no rehacer
  // la seleccion al cambiar de vista.
  const [skills, setSkills] = useState(['In_Contingencias']);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('abandono-theme', theme);
  }, [theme]);

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      setIsConnected(res.ok);
    } catch {
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-[#0b1020] font-raleway transition-colors">
      <header className="bg-white dark:bg-[#0f1530] border-b border-gray-200 dark:border-slate-700 sticky top-0 z-50 transition-colors">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={theme === 'dark' ? '/logo-xuma-blanco.png' : '/logo-xuma.png'}
                  alt="Xuma"
                  className="h-10 w-auto object-contain"
                />
                <div>
                  <h1 className="font-raleway font-bold text-xl text-xuma-gray dark:text-white leading-tight">Abandono Xuma</h1>
                  <p className="font-raleway text-xs text-gray-500 dark:text-slate-400">Contingencia · Monitoreo en tiempo real</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 ml-6 px-4 py-2 rounded-lg bg-gray-50 dark:bg-slate-800/60">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-xuma-green-dark' : 'bg-red-500'} animate-pulse`}></span>
                <span className="font-raleway text-sm text-gray-600 dark:text-slate-300">
                  {isConnected ? 'Conectado en vivo' : 'Desconectado'}
                </span>
                {lastUpdate && (
                  <span className="font-raleway text-xs text-gray-400 dark:text-slate-500">
                    Actualizado: {lastUpdate}
                  </span>
                )}
              </div>
            </div>

            <nav className="flex items-center gap-2">
              <button
                onClick={() => setView('dashboard')}
                className={`px-4 py-2 rounded-lg font-raleway font-medium text-sm transition-colors ${
                  view === 'dashboard'
                    ? 'bg-xuma-blue dark:bg-xuma-green-dark text-white'
                    : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Dashboard
              </button>
              <button
                onClick={() => setView('detail')}
                className={`px-4 py-2 rounded-lg font-raleway font-medium text-sm transition-colors ${
                  view === 'detail'
                    ? 'bg-xuma-blue dark:bg-xuma-green-dark text-white'
                    : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Detalle
              </button>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="px-3 py-2 rounded-lg font-raleway font-medium text-sm transition-colors text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700"
                title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              >
                {theme === 'dark' ? (
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
                {theme === 'dark' ? 'Claro' : 'Oscuro'}
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1500px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
        <SkillFilter selected={skills} onChange={setSkills} />
        {view === 'dashboard' && (
          <Dashboard skills={skills} onUpdate={(time) => setLastUpdate(time)} />
        )}
        {view === 'detail' && <DetailView skills={skills} />}
      </main>

      <footer className="bg-white dark:bg-[#0f1530] border-t border-gray-200 dark:border-slate-700 mt-auto transition-colors">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center">
          <p className="font-raleway text-sm text-gray-500 dark:text-slate-400">
            Abandono Xuma © 2026 - Sistema de monitoreo de contingencia
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
