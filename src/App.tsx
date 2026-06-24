import { ManagerLayout } from './apps/manager/ManagerLayout';
import { DownloaderLayout } from './apps/downloader/DownloaderLayout';
import './App.css'; // Make sure Tailwind is configured here
import { TooltipProvider } from './components/ui/tooltip';
import { useAppStore } from './store/useAppStore';

function App() {
  const mode = useAppStore((state) => state.mode);

  return (
    <TooltipProvider delayDuration={200}>
      {mode === 'manager' ? <ManagerLayout /> : <DownloaderLayout />}
    </TooltipProvider>
  );
}

export default App;
