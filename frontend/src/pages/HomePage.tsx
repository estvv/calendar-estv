import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchedules } from '../contexts/SchedulesContext';

// "/" sends you to the most recent schedule, or shows an empty state.
export function HomePage() {
  const navigate = useNavigate();
  const { schedules, loading } = useSchedules();

  useEffect(() => {
    if (!loading && schedules.length > 0) {
      navigate(`/schedule/${schedules[0].id}`, { replace: true });
    }
  }, [loading, schedules, navigate]);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-neutral-400 text-sm">Loading...</div>;
  }

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-sm px-6">
        <svg className="w-12 h-12 mx-auto text-neutral-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm text-neutral-400">
          No schedules yet. Use the <span className="font-medium text-neutral-600">+</span> in the sidebar to create one, or import a JSON file.
        </p>
      </div>
    </div>
  );
}
