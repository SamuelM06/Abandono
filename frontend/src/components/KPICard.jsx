import { useEffect, useRef, useState } from 'react';

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

const THEMES = {
  total: {
    gradient: 'linear-gradient(135deg, #120180 0%, #2b1bff 55%, #00CD93 130%)',
    glow: '0 12px 32px -8px rgba(18,1,128,0.55)',
    ring: 'rgba(90,226,128,0.5)',
  },
  alert: {
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 55%, #f97316 130%)',
    glow: '0 12px 32px -8px rgba(220,38,38,0.55)',
    ring: 'rgba(252,165,165,0.5)',
  },
  success: {
    gradient: 'linear-gradient(135deg, #004d3a 0%, #00CD93 60%, #5AE280 130%)',
    glow: '0 12px 32px -8px rgba(0,205,147,0.5)',
    ring: 'rgba(90,226,128,0.5)',
  },
  info: {
    gradient: 'linear-gradient(135deg, #0c1a4d 0%, #1d4ed8 60%, #38bdf8 130%)',
    glow: '0 12px 32px -8px rgba(29,78,216,0.55)',
    ring: 'rgba(147,197,253,0.5)',
  },
  warn: {
    gradient: 'linear-gradient(135deg, #78350f 0%, #f59e0b 60%, #fbbf24 130%)',
    glow: '0 12px 32px -8px rgba(245,158,11,0.5)',
    ring: 'rgba(253,230,138,0.5)',
  },
};

export default function KPICard({ title, value, subtitle, icon, color, textColor, alert, success, info, warn, share = 0 }) {
  const numeric = Number(String(value).replace(/[^\d]/g, '')) || 0;
  const animated = useCountUp(numeric);
  const theme = alert ? THEMES.alert : success ? THEMES.success : info ? THEMES.info : warn ? THEMES.warn : THEMES.total;
  const formatted = new Intl.NumberFormat('es-CO').format(animated);

  return (
    <div
      className="kpi-card relative overflow-hidden text-white animate-slide-in !p-4"
      style={{ background: theme.gradient, boxShadow: theme.glow }}
    >
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-10 -left-6 w-36 h-36 rounded-full bg-black/20 blur-2xl" />
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-raleway text-[11px] font-semibold tracking-widest uppercase opacity-90 leading-tight">{title}</p>
          <p className="font-raleway font-extrabold text-4xl leading-none mt-1.5 tabular-nums drop-shadow-lg">{formatted}</p>
          {subtitle && <p className="font-raleway text-xs opacity-85 mt-1.5">{subtitle}</p>}
        </div>
        <div
          className="shrink-0 p-2.5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/25 shadow-lg animate-pulse-soft"
          style={{ boxShadow: `0 0 0 3px ${theme.ring}, 0 8px 20px -6px rgba(0,0,0,0.5)` }}
        >
          {icon}
        </div>
      </div>
      <div className="relative z-10 mt-3">
        <div className="h-1.5 rounded-full bg-black/25 overflow-hidden">
          <div
            className="h-full rounded-full bg-white/90 transition-all duration-1000"
            style={{ width: `${Math.min(100, Math.max(0, share))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
