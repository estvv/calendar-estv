import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col bg-white print-root">
      <Header />
      <div className="flex-1 flex overflow-hidden print-root">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-neutral-50/50 print-root print:bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
