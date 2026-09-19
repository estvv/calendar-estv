import { Link, useNavigate, useParams } from 'react-router-dom';
import { logout } from '../../utils/auth';
import { useSchedules } from '../../contexts/SchedulesContext';

export function Header() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { schedules } = useSchedules();

  return (
    <header className="h-14 border-b border-neutral-200 flex items-center px-4 md:px-6 gap-4 print-hidden">
      <Link to="/" className="font-bold text-neutral-900">Calendar</Link>

      {/* Mobile schedule switcher; the sidebar covers this on wider screens. */}
      {schedules.length > 0 && (
        <select
          value={id ?? ''}
          onChange={(e) => navigate(`/schedule/${e.target.value}`)}
          className="md:hidden flex-1 min-w-0 px-3 py-1.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:border-neutral-500"
        >
          {!id && <option value="">Select a schedule</option>}
          {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}

      <div className="flex-1 hidden md:block" />

      <button
        onClick={logout}
        className="px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-colors"
      >
        Logout
      </button>
    </header>
  );
}
