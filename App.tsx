
import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Wallet, RefreshCw, Calendar, Database, Search } from 'lucide-react';
import MatchCard from './components/MatchCard';
import BankrollManager from './components/BankrollManager';
import { fetchUpcomingMatchesAndAnalyze, reAnalyzeMatch } from './services/geminiService';
import { MatchAnalysis, BankrollSettings, DEFAULT_BANKROLL } from './types';

const KEY_MATCHES = 'laymaster_matches_v2';
const KEY_DATE = 'laymaster_last_fetch_date';
const KEY_BANKROLL = 'laymaster_bankroll_v2';

const App: React.FC = () => {
  const [matches, setMatches] = useState<MatchAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [bankrollSettings, setBankrollSettings] = useState<BankrollSettings>(DEFAULT_BANKROLL);
  const [isBankrollModalOpen, setIsBankrollModalOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const sortMatchesByDate = (matchList: MatchAnalysis[]) => {
    return [...matchList].sort((a, b) => {
      try {
        const parse = (dateStr: string) => {
          const [datePart, timePart] = dateStr.split(' ');
          const [day, month] = (datePart || "").split('/').map(n => parseInt(n));
          const [hour, minute] = (timePart || "").split(':').map(n => parseInt(n));
          const d = new Date();
          if (month) d.setMonth(month - 1);
          if (day) d.setDate(day);
          if (hour !== undefined) d.setHours(hour);
          if (minute !== undefined) d.setMinutes(minute);
          return d.getTime();
        };
        return parse(a.date) - parse(b.date);
      } catch (e) {
        return 0;
      }
    });
  };

  useEffect(() => {
    const savedBankroll = localStorage.getItem(KEY_BANKROLL);
    if (savedBankroll) {
      setBankrollSettings(JSON.parse(savedBankroll));
    }
  }, []);

  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const savedDate = localStorage.getItem(KEY_DATE);
    const savedMatches = localStorage.getItem(KEY_MATCHES);

    if (!forceRefresh && savedDate === today && savedMatches) {
      const parsed = JSON.parse(savedMatches);
      setMatches(sortMatchesByDate(parsed));
      setLastUpdate(savedDate);
      setLoading(false);
      return;
    }

    const data = await fetchUpcomingMatchesAndAnalyze();
    if (data.length > 0) {
      const sorted = sortMatchesByDate(data);
      setMatches(sorted);
      setLastUpdate(today);
      localStorage.setItem(KEY_MATCHES, JSON.stringify(sorted));
      localStorage.setItem(KEY_DATE, today);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveBankroll = (newSettings: BankrollSettings) => {
    setBankrollSettings(newSettings);
    localStorage.setItem(KEY_BANKROLL, JSON.stringify(newSettings));
  };

  const handleReAnalyze = async (id: string) => {
    setUpdatingId(id);
    const match = matches.find(m => m.matchId === id);
    if (match) {
      const updatedMatch = await reAnalyzeMatch(match);
      const newMatches = matches.map(m => m.matchId === id ? updatedMatch : m);
      const sorted = sortMatchesByDate(newMatches);
      setMatches(sorted);
      localStorage.setItem(KEY_MATCHES, JSON.stringify(sorted));
    }
    setUpdatingId(null);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-emerald-500/30">
      <nav className="border-b border-slate-800 bg-[#0f172a]/95 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-black tracking-tighter uppercase italic">
                Lay<span className="text-emerald-500">Master</span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsBankrollModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all"
              >
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline text-xs font-bold uppercase">Banca</span>
              </button>
              
              <button 
                onClick={() => loadData(true)}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline text-xs font-bold uppercase">{loading ? '...' : 'Atualizar'}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <header className="mb-8">
          <h2 className="text-2xl font-black text-white uppercase italic leading-none mb-2">
            Análise <span className="text-emerald-500">Tempo Real</span>
          </h2>
          <p className="text-slate-500 text-sm font-medium">IA focada em Lay ao pior time e Brasileirão A/B.</p>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-slate-800/30 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-black uppercase text-slate-300">Hoje</span>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdate && (
              <div className="text-[10px] text-slate-500 font-bold uppercase bg-slate-900 px-2 py-1 rounded">
                Sinc: {lastUpdate}
              </div>
            )}
            <div className="text-[10px] text-emerald-400 font-bold uppercase bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
              {matches.filter(m => m.isValidOpportunity).length} Op.
            </div>
          </div>
        </div>

        {loading && matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse text-slate-600">
            <Search className="w-12 h-12 mb-4" />
            <p className="text-xs font-bold uppercase tracking-widest">Buscando jogos reais na web...</p>
          </div>
        ) : matches.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map(match => (
              <MatchCard 
                key={match.matchId}
                data={match}
                bankroll={bankrollSettings}
                onReAnalyze={handleReAnalyze}
                isUpdating={updatingId === match.matchId}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-800/20 rounded-2xl border border-slate-800 border-dashed">
             <h3 className="text-sm font-black text-slate-500 uppercase">Nenhum jogo ativo</h3>
             <button onClick={() => loadData(true)} className="mt-4 text-xs font-bold text-emerald-500 underline uppercase">Tentar novamente</button>
          </div>
        )}
      </main>

      <BankrollManager 
        isOpen={isBankrollModalOpen} 
        onClose={() => setIsBankrollModalOpen(false)}
        settings={bankrollSettings}
        onSave={handleSaveBankroll}
      />
    </div>
  );
};

export default App;
