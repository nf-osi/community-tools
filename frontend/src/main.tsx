import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Landing from './Landing';
import AgentGallery from './agents/AgentGallery';
import GwasAgentApp from './gwas/GwasAgentApp';
import { usePath } from './router';
import './index.css';

// Dependency-free routing:
//   /                 -> landing (choose Roadmap or Agents)
//   /roadmap          -> community roadmap app
//   /agents           -> agent gallery
//   /agents/gwas      -> GWAS agent  (/gwas kept for back-compat)
function Root() {
  const path = usePath();
  if (path.startsWith('/roadmap')) return <App />;
  if (path.startsWith('/agents/gwas') || path.startsWith('/gwas')) return <GwasAgentApp />;
  if (path.startsWith('/agents')) return <AgentGallery />;
  return <Landing />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
