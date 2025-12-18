import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Trophy, Wallet, RefreshCw, Calendar, Search, AlertCircle, Info, ChevronRight, BarChart3, ShieldCheck, Key, Zap } from 'lucide-react';
import MatchCard from './components/MatchCard';
import BankrollManager from './components/BankrollManager';
import { fetchUpcomingMatchesAndAnalyze, reAnalyzeMatch } from './services/geminiService';
import { MatchAnalysis, BankrollSettings, DEFAULT_BANKROLL } from './types';

// Augment the global AIStudio interface instead of redeclaring the window.aistudio property.
// This resolves "identical modifiers" and "same type" conflicts with the environment's pre-defined types.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}

const App: React.FC = () => {
  const [matches, setMatches] = useState<MatchAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [bankroll, setBankroll] = useState<BankrollSettings>(() => {
    const saved = localStorage.getItem('laymaster_bankroll_v2');
    return saved ? JSON.parse(saved) : DEFAULT_BANKROLL;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Verifica se o usuário já selecionou uma chave
  useEffect(() => {
    const checkKey = async () => {
      // Use the pre-configured window.aistudio methods
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    };
    checkKey();
  }, []);

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      const parse = (s: string) => {
        const parts = s.split(' ');
        if (parts.length < 2) return 0;
        const [d, t] = parts;
        const [day, mon] = d.split('/').map(Number);
        const [h, m] = t.split(':').map(Number);
        const now = new Date();
        return new Date(now.getFullYear(), mon - 1, day, h, m).getTime();
      };
      try { return parse(a.date) - parse(b.date); } catch { return 0; }
    });
  }, [matches]);

  const load = useCallback(async () => {
    if (!hasApiKey) {
      setError("Você precisa ativar a IA primeiro.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUpcomingMatchesAndAnalyze((status) => setStatusMessage(status));
      setMatches(data);
      if (data.length === 0) setError("Nenhuma oportunidade Lay clara encontrada para agora.");
    } catch (e: any) {
      if (e.message === "KEY_EXPIRED") {
        setHasApiKey(false);
        setError("Sua sessão de IA expirou. Por favor, selecione a chave novamente.");
      } else {
        setError("A IA encontrou um erro ao acessar dados da web. Tente novamente.");
      }
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  }, [hasApiKey]);

  const handleSelectKey = async () => {
    // Triggers the API key selection dialog
    await window.aistudio.openSelectKey();
    setHasApiKey(true);
    setError(null);
  };

  const handleUpdate = async (id: string) => {
    setUpdatingId(id);
    const m = matches.find(x => x.matchId === id);
    if (m) {
      try {
        const updated = await reAnalyzeMatch(m);
        setMatches(prev => prev.map(x => x.matchId === id ? updated : x));
      } catch (e) {}
    }
    setUpdatingId(null);
  };

  const saveBankroll = (newSettings: BankrollSettings) => {
    setBankroll(newSettings);
    localStorage.setItem('laymaster_bankroll_v2', JSON.stringify(newSettings));
  };

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full">
          <div className="bg-emerald-500 w-20 h-20 rounded-3xl mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.4)] mb-8 animate-pulse">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white italic uppercase mb-4">Bem-vindo ao <br/><span className="text-emerald-500 underline decoration-2 underline-offset-8">LayMaster AI</span></h1>
          <p className="text-slate-400 font-medium mb-10 leading-relaxed">
            Para analisar jogos reais em tempo real, precisamos de uma conexão segura com o Google Search via Gemini 3 Pro.
          </p>
          <button 
            onClick={handleSelectKey}
            className="w-full bg-white text-slate-950 font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-400 transition-all active:scale-95 shadow-xl"
          >
            <Key className="w-5 h-5" />
            CONECTAR INTELIGÊNCIA ARTIFICIAL
          </button>
          <p className="mt-6 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            Requer chave de projeto faturado (API Key Pay-as-you-go)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navbar Profissional */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter leading-none">LAY<span className="text-emerald-500">MASTER</span></h1>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">AI Prediction Platform</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all"
            >
              <Wallet className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-white hidden sm:block">Banca: {bankroll.currency} {bankroll.totalBankroll}</span>
            </button>
            <button 
              onClick={load}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-400 p-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero / Main Analysis Hub */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12">
        <div className="mb-12">
          <h2 className="text-4xl font-black text-white italic uppercase leading-none mb-4">
            Análises de <span className="text-emerald-500">Valor</span>
          </h2>
          <p className="text-slate-500 font-medium">IA conectada ao Google Search buscando as melhores zebras de hoje.</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative mb-8">
              <div className="w-20 h-20 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
              <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-emerald-500 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{statusMessage || "Processando..." }</h3>
            <p className="text-slate-500 text-sm max-w-xs text-center">Isso pode levar até 30 segundos enquanto a IA lê notícias reais do mundo todo.</p>
          </div>
        ) : error ? (
          <div className="text-center py-24 bg-slate-900/30 rounded-3xl border border-slate-800">
            <AlertCircle className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h4 className="text-xl font-bold text-slate-400 uppercase mb-6">{error}</h4>
            <button onClick={load} className="px-8 py-4 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-400">
              TENTAR ESCANEAR AGORA
            </button>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-24">
            <Zap className="w-16 h-16 text-slate-800 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-600 uppercase mb-8 tracking-widest">Nenhuma análise carregada</h3>
            <button onClick={load} className="px-10 py-5 bg-white text-slate-950 font-black rounded-2xl hover:scale-105 transition-all">
              INICIAR BUSCA POR ZEBRAS
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedMatches.map(m => (
              <MatchCard 
                key={m.matchId} 
                data={m} 
                bankroll={bankroll} 
                onReAnalyze={handleUpdate}
                isUpdating={updatingId === m.matchId}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="bg-slate-950 border-t border-slate-900 py-12 px-4 text-center">
        <p className="text-[10px] text-slate-700 font-black uppercase tracking-widest">
          © {new Date().getFullYear()} LayMaster AI - Tecnologia Gemini 3 Pro Grounding
        </p>
      </footer>

      <BankrollManager 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        settings={bankroll} 
        onSave={saveBankroll} 
      />
    </div>
  );
};

export default App;