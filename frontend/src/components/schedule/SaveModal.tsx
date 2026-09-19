import { useState } from 'react';
import { Modal } from '../shared/Modal';
import type { Schedule, CalendarEvent } from '../../types';
import { schedulesApi } from '../../utils/api';
import { downloadPng, downloadBlob, slug } from '../../utils/renderPng';

interface SaveModalProps {
  schedule: Schedule;
  events: CalendarEvent[];
  activeDay: number;
  onScheduleChange: (schedule: Schedule) => void;
  onClose: () => void;
}

export function SaveModal({ schedule, events, activeDay, onScheduleChange, onClose }: SaveModalProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const shareUrl = schedule.is_shared && schedule.share_token
    ? `${window.location.origin}/s/${schedule.share_token}`
    : null;

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError('');
    setMessage('');
    try {
      await fn();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const handleShare = () => run('share', async () => {
    const { share_token } = await schedulesApi.share(schedule.id);
    const url = `${window.location.origin}/s/${share_token}`;
    onScheduleChange({ ...schedule, share_token, is_shared: 1 });
    await navigator.clipboard.writeText(url).catch(() => {});
    setMessage('Link copied to clipboard');
  });

  const handleUnshare = () => run('share', async () => {
    await schedulesApi.unshare(schedule.id);
    onScheduleChange({ ...schedule, share_token: null, is_shared: 0 });
    setMessage('Link disabled');
  });

  const handleCopy = () => run('copy', async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setMessage('Link copied to clipboard');
  });

  const handlePrint = () => {
    onClose();
    setTimeout(() => window.print(), 100);
  };

  const handlePng = () => run('png', async () => {
    await downloadPng({ title: schedule.name, settings: schedule, events, day: activeDay });
  });

  const handleExport = () => run('export', async () => {
    const data = await schedulesApi.export(schedule.id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${slug(schedule.name)}.json`);
  });

  const primary = 'w-full px-4 py-2.5 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50';
  const secondary = 'w-full px-4 py-2.5 border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 hover:text-neutral-900 transition-colors disabled:opacity-50';

  return (
    <Modal title="Save" onClose={onClose}>
      <div className="space-y-5">
        <section>
          <div className="text-sm font-semibold text-neutral-900 mb-1.5">Direct link</div>
          {shareUrl ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 min-w-0 px-3 py-2 border border-neutral-200 rounded-lg text-xs text-neutral-600 bg-neutral-50 focus:outline-none"
                />
                <button onClick={handleCopy} disabled={busy !== null} className="px-3 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50">
                  Copy
                </button>
              </div>
              <button onClick={handleUnshare} disabled={busy !== null} className="text-xs text-neutral-500 hover:text-red-600 transition-colors">
                Disable link
              </button>
            </div>
          ) : (
            <button onClick={handleShare} disabled={busy !== null} className={primary}>
              {busy === 'share' ? 'Creating...' : 'Create a read-only link'}
            </button>
          )}
          <p className="text-xs text-neutral-400 mt-1.5">Anyone with the link can view this schedule without logging in.</p>
        </section>

        <section className="space-y-2">
          <button onClick={handlePrint} disabled={busy !== null} className={secondary}>Print / PDF</button>
          <button onClick={handlePng} disabled={busy !== null} className={secondary}>
            {busy === 'png' ? 'Rendering...' : 'Download PNG'}
          </button>
        </section>

        <section>
          <button onClick={handleExport} disabled={busy !== null} className={secondary}>
            {busy === 'export' ? 'Exporting...' : 'Export JSON'}
          </button>
          <p className="text-xs text-neutral-400 mt-1.5">Save the schedule as a JSON file to import it later.</p>
        </section>

        {message && <p className="text-sm text-green-600 text-center">{message}</p>}
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      </div>
    </Modal>
  );
}
