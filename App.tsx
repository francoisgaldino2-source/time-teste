
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Trophy, Wallet, RefreshCw, Calendar, Search, AlertCircle } from 'lucide-react';
import MatchCard from './components/MatchCard';
import BankrollManager from './components/BankrollManager';
import { fetchUpcomingMatchesAndAnalyze, reAnalyzeMatch } from './services/geminiService';
import { MatchAnalysis, BankrollSettings, DEFAULT_BANKROLL } from './types';

const App: React.FC = () => {
  const [matches, setMatches] = useState<MatchAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [bankroll, setBankroll] = useState<BankrollSettings>(() => {
    const saved = localStorage.getItem('laymaster_bankroll_v2');
    return saved ? JSON.parse(saved) : DEFAULT_BANKROLL;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Ordenação Cronológica
  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      const parse = (s: string) => {
        const [d, t] = s.split(' ');
        const [day, mon] = d.split('/').map(Number);
        const [h, m] = t.split(':').map(Number);
        const now = new Date();
        return new Date(now.getFullYear(), mon - 1, day, h, m).getTime();
      };
      try { return parse(a.date) - parse(b.date); } catch { return 0; }
    });
  }, [matches]);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUpcomingMatchesAndAnalyze();
      if (data.length > 0) setMatches(data);
      else if (!force) setError("Nenhum jogo encontrado para análise hoje.");
    } catch (e) {
      setError("Erro ao carregar dados da IA.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = async (id: string) => {
    setUpdatingId(id);
    const m = matches.find(x => x.matchId === id);
    if (m) {
      const updated = await reAnalyzeMatch(m);
      setMatches(prev => prev.map(x => x.matchId === id ? updated : x));
    }
    setUpdatingId(null);
  };

  const saveBankroll = (newSettings: BankrollSettings) => {
    setBankroll(newSettings);
    localStorage.setItem('laymaster_bankroll_v2', JSON.stringify(newSettings));
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 pb-20">
      <nav className="sticky top-0 z-40 bg-[#0f172a]/90 backdrop-blur-lg border-b border-slate-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 p-1.5 rounded shadow-lg shadow-emerald-500/20">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black italic tracking-tighter">LAY<span className="text-emerald-500">MASTER</span></h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl hover:bg-slate-700 transition-all"
            >
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline text-xs font-bold">GERENCIAR</span>
            </button>
            <button 
              onClick={() => load(true)}
              className="bg-emerald-600 p-2 rounded-xl hover:bg-emerald-500 transition-all"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-10">
          <h2 className="text-3xl font-black text-white italic uppercase leading-none">
            Análise <span className="text-emerald-500">Inteligente</span>
          </h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">Série A, Série B e Ligas Europeias • LAY ao pior time.</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-600">
            <Search className="w-16 h-16 animate-pulse mb-4 text-emerald-500/50" />
            <span className="text-xs font-black uppercase tracking-widest">Consultando IA e Jogos Reais...</span>
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-slate-800/30 rounded-3xl border border-dashed border-slate-700">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">{error}</p>
            <button onClick={() => load(true)} className="mt-4 text-emerald-500 font-black uppercase text-xs underline">Tentar novamente</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* Botão flutuante para mobile se escondido no topo */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 sm:hidden w-14 h-14 bg-emerald-600 rounded-full shadow-2xl flex items-center justify-center z-50 animate-bounce"
      >
        <Wallet className="w-6 h-6 text-white" />
      </button>

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
