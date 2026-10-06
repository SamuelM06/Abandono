export default function KPICard({ title, value, subtitle, icon, color, textColor, alert, success }) {
  return (
    <div className={`kpi-card relative overflow-hidden ${color} ${textColor}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent" />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="kpi-label opacity-90">{title}</p>
          <p className="kpi-value mt-1">{value}</p>
          {subtitle && <p className="kpi-label opacity-80 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${alert ? 'bg-red-500/20' : success ? 'bg-xuma-green-dark/20' : 'bg-white/20'}`}>
          {icon}
        </div>
      </div>
      {(alert || success) && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30" />
      )}
    </div>
  );
}