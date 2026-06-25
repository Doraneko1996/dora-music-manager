import { ManagerLayout } from './apps/manager/ManagerLayout';
import { DownloaderLayout } from './apps/downloader/DownloaderLayout';
import './App.css'; // Make sure Tailwind is configured here
import { TooltipProvider } from './components/ui/tooltip';
import { useAppStore } from './store/useAppStore';
import { useAudioStore } from './store/useAudioStore';
import { useFileSystemWatcher } from './hooks/useFileSystemWatcher';
import { useDownloaderEvents } from './hooks/useDownloaderEvents';
import { Toaster as CustomToaster } from './components/ui/sonner';

function App() {
  const mode = useAppStore((state) => state.mode);
  const directoryPath = useAudioStore((state) => state.directoryPath);

  useFileSystemWatcher(directoryPath);
  useDownloaderEvents();

  return (
    <TooltipProvider delayDuration={200}>
      {mode === 'manager' ? <ManagerLayout /> : <DownloaderLayout />}
      <CustomToaster position="bottom-right" theme="dark" />
    </TooltipProvider>
  );
}

export default App;
