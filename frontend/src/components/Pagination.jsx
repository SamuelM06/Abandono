export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between">
      <div className="font-raleway text-sm text-gray-500">
        Página {currentPage} de {totalPages}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-sm font-raleway text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-gray-200"
        >
          ««
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-sm font-raleway text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-gray-200"
        >
          «
        </button>
        {start > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className="px-3 py-1.5 text-sm font-raleway text-gray-600 hover:bg-gray-100 rounded border border-gray-200"
            >
              1
            </button>
            {start > 2 && (
              <span className="px-2 text-gray-400">...</span>
            )}
          </>
        )}
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1.5 text-sm font-raleway rounded border ${
              page === currentPage
                ? 'bg-xuma-blue text-white border-xuma-blue'
                : 'text-gray-600 hover:bg-gray-100 border-gray-200'
            }`}
          >
            {page}
          </button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && (
              <span className="px-2 text-gray-400">...</span>
            )}
            <button
              onClick={() => onPageChange(totalPages)}
              className="px-3 py-1.5 text-sm font-raleway text-gray-600 hover:bg-gray-100 rounded border border-gray-200"
            >
              {totalPages}
            </button>
          </>
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-sm font-raleway text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-gray-200"
        >
          »
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-sm font-raleway text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-gray-200"
        >
          »»
        </button>
      </div>
    </div>
  );
}