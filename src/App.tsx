import { Layout } from './components/Layout';
import './App.css'; // Make sure Tailwind is configured here

import { TooltipProvider } from './components/ui/tooltip';

function App() {
  return (
    <TooltipProvider delayDuration={200}>
      <Layout />
    </TooltipProvider>
  );
}

export default App;
