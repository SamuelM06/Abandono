export default function FilterChips({ active, onChange }) {
  const filters = [
    { value: 'medio_dia', label: 'Medio día (8:00 - 12:00)', icon: '☀️' },
    { value: 'dia_completo', label: 'Día completo (8:00 - 17:30)', icon: '📅' },
    { value: 'fuera_horario', label: 'Fuera de horario (17:30+)', icon: '🌙' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onChange(filter.value)}
          className={`filter-chip ${
            active === filter.value ? 'filter-chip-active' : 'filter-chip-inactive'
          }`}
          aria-pressed={active === filter.value}
        >
          <span className="mr-1">{filter.icon}</span>
          {filter.label}
        </button>
      ))}
    </div>
  );
}