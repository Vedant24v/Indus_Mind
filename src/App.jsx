import React, { useState, useEffect } from 'react';
import UploadPanel from './components/UploadPanel';
import ChatPanel from './components/ChatPanel';
import { GradientTracing } from './components/ui/gradient-tracing';
import { Cpu, ShieldCheck } from 'lucide-react';

function App() {
  const [docId, setDocId] = useState('');
  const [fileName, setFileName] = useState('');
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleUploadSuccess = (id, name) => {
    setDocId(id);
    setFileName(name);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-black via-zinc-950 to-zinc-900 text-slate-200 overflow-hidden relative font-sans">
      {/* Premium Backdrop Ambient Glows (Silver/White Spotlight) */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-zinc-800/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-zinc-700/5 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Top Navbar */}
      <header className="h-14 bg-black/40 backdrop-blur-md border-b border-zinc-800/50 flex items-center justify-between px-6 shrink-0 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="bg-zinc-800/30 border border-zinc-700/50 p-1.5 rounded shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            <Cpu className="text-zinc-400 w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white uppercase">
              IndusMind
            </h1>
            <p className="text-[10px] text-zinc-400 font-medium">
              RAG-Powered Industrial Document Q&A
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
            <ShieldCheck className="text-zinc-400 w-4 h-4" />
            <span>Secure Enterprise Instance</span>
          </div>
        </div>
      </header>

      {/* Animated Gradient Tracing under Navbar */}
      <div className="h-[2px] w-full bg-black/40 overflow-hidden shrink-0 relative z-10">
        <GradientTracing
          width={windowWidth}
          height={2}
          gradientColors={["#52525b", "#f4f4f5", "#52525b"]}
          animationDuration={3}
          strokeWidth={2}
        />
      </div>

      {/* Main Panel Layout */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Left Side: Upload Panel (Translucent container) */}
        <div className="w-80 md:w-96 border-r border-zinc-800/40 shrink-0 h-full bg-black/20 backdrop-blur-sm">
          <UploadPanel onUploadSuccess={handleUploadSuccess} />
        </div>

        {/* Right Side: Chat Panel (Transparent container) */}
        <div className="flex-1 h-full bg-transparent">
          <ChatPanel docId={docId} fileName={fileName} onUploadSuccess={handleUploadSuccess} />
        </div>
      </div>
    </div>
  );
}

export default App;
