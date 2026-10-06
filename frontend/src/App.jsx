import { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import DetailView from './components/DetailView';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

function App() {
  const [view, setView] = useState('dashboard');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isConnected, setIsConnected] = useState(true);

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
    <div className="min-h-screen bg-gray-50 font-raleway">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-xuma-blue rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                  </svg>
                </div>
                <div>
                  <h1 className="font-raleway font-bold text-xl text-xuma-gray">Abandono Xuma</h1>
                  <p className="font-raleway text-xs text-gray-500">Contingencia - Monitoreo en tiempo real</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 ml-6 px-4 py-2 rounded-lg bg-gray-50">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-xuma-green-dark' : 'bg-red-500'} animate-pulse`}></span>
                <span className="font-raleway text-sm text-gray-600">
                  {isConnected ? 'Conectado en vivo' : 'Desconectado'}
                </span>
                {lastUpdate && (
                  <span className="font-raleway text-xs text-gray-400">
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
                    ? 'bg-xuma-blue text-white'
                    : 'text-gray-600 hover:bg-gray-100'
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
                    ? 'bg-xuma-blue text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Detalle
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {view === 'dashboard' && (
          <Dashboard onUpdate={(time) => setLastUpdate(time)} />
        )}
        {view === 'detail' && <DetailView />}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center">
          <p className="font-raleway text-sm text-gray-500">
            Abandono Xuma © 2026 - Sistema de monitoreo de contingencia
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;