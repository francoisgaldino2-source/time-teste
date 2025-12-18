import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { LayoutDashboard, Wallet, RefreshCw, LogOut, Calendar, Database } from 'lucide-react';
import MatchCard from './components/MatchCard';
import BankrollManager from './components/BankrollManager';
import { fetchUpcomingMatchesAndAnalyze, reAnalyzeMatch } from './services/geminiService';
import { MatchAnalysis, BankrollSettings, DEFAULT_BANKROLL } from './types';

// Storage Keys
const KEY_MATCHES = 'laymaster_matches_v1';
const KEY_DATE = 'laymaster_last_fetch_date';
const KEY_BANKROLL = 'laymaster_bankroll_v1';

const App: React.FC = () => {
  const [matches, setMatches] = useState<MatchAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [bankrollSettings, setBankrollSettings] = useState<BankrollSettings>(DEFAULT_BANKROLL);
  const [isBankrollModalOpen, setIsBankrollModalOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Helper to sort matches chronologically
  const sortMatchesByDate = (matchList: MatchAnalysis[]) => {
    return [...matchList].sort((a, b) => {
      try {
        // Parse format "DD/MM HH:mm"
        const parse = (dateStr: string) => {
          const [datePart, timePart] = dateStr.split(' ');
          if (!datePart) return 0;
          
          const [day, month] = datePart.split('/').map(n => parseInt(n));
          const [hour, minute] = timePart ? timePart.split(':').map(n => parseInt(n)) : [0, 0];
          
          // Use current year, handle year rollover if needed (simplified here)
          const d = new Date();
          d.setMonth((month || 1) - 1);
          d.setDate(day || 1);
          d.setHours(hour || 0);
          d.setMinutes(minute || 0);
          d.setSeconds(0);
          return d.getTime();
        };

        return parse(a.date) - parse(b.date);
      } catch (e) {
        return 0;
      }
    });
  };

  // 1. Load Bankroll from Storage on Mount
  useEffect(() => {
    const savedBankroll = localStorage.getItem(KEY_BANKROLL);
    if (savedBankroll) {
      try {
        setBankrollSettings(JSON.parse(savedBankroll));
      } catch (e) {
        console.error("Failed to load bankroll", e);
      }
    }
  }, []);

  // 2. Main Data Loading Logic (Cache vs API)
  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const savedDate = localStorage.getItem(KEY_DATE);
    const savedMatches = localStorage.getItem(KEY_MATCHES);

    // Check if we have valid cached data for TODAY
    if (!forceRefresh && savedDate === today && savedMatches) {
      try {
        const parsed = JSON.parse(savedMatches);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log("Loaded from local database (cache)");
          // Sort cached data just in case
          setMatches(sortMatchesByDate(parsed));
          setLastUpdate(savedDate);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("Cache corrupted, fetching new data...");
      }
    }

    // Fetch new data from AI
    console.log("Fetching fresh data from AI...");
    const data = await fetchUpcomingMatchesAndAnalyze();
    
    if (data.length > 0) {
      const sortedData = sortMatchesByDate(data);
      setMatches(sortedData);
      setLastUpdate(today);
      
      // Save to Storage
      localStorage.setItem(KEY_MATCHES, JSON.stringify(sortedData));
      localStorage.setItem(KEY_DATE, today);
    }
    
    setLoading(false);
  }, []);

  // Initial Load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save Bankroll
  const handleSaveBankroll = (newSettings: BankrollSettings) => {
    setBankrollSettings(newSettings);
    localStorage.setItem(KEY_BANKROLL, JSON.stringify(newSettings));
  };

  // Re-analyze specific match
  const handleReAnalyze = async (id: string) => {
    setUpdatingId(id);
    const match = matches.find(m => m.matchId === id);
    if (match) {
      const updatedMatch = await reAnalyzeMatch(match);
      const newMatches = matches.map(m => m.matchId === id ? updatedMatch : m);
      // Ensure sorting persists
      const sortedNewMatches = sortMatchesByDate(newMatches);
      setMatches(sortedNewMatches);
      // Update cache
      localStorage.setItem(KEY_MATCHES, JSON.stringify(sortedNewMatches));
    }
    setUpdatingId(null);
  };

  const currentDateDisplay = new Date().toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  const validOpportunities = matches.filter(m => m.isValidOpportunity).length;

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 pb-20">
      
      {/* Top Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/95 sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <TrophyIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                  LayMaster
                </h1>
                <p className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider">
                  Análise Inteligente
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              {/* Bankroll Button: Visible on Mobile (Icon only) and Desktop (Full) */}
              <button 
                onClick={() => setIsBankrollModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all"
                title="Gerenciar Banca"
              >
                <Wallet className="w-4 h-4" />
                <span className="hidden md:inline">Gerenciar Banca</span>
              </button>
              
              <button 
                onClick={() => loadData(true)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-900/20 transition-all active:scale-95 disabled:opacity-50"
                title="Forçar atualização (Ignorar Cache)"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{loading ? 'Buscando...' : 'Atualizar'}</span>
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Identifique Oportunidades de <span className="text-emerald-400">Lay Betting</span></h2>
          <p className="text-slate-400 max-w-2xl text-lg">
            A IA busca jogos reais na web, organiza por horário e analisa o risco.
          </p>
        </div>

        {/* Date & Filters Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-3 text-emerald-400">
            <Calendar className="w-5 h-5" />
            <span className="font-bold capitalize text-lg">{currentDateDisplay}</span>
          </div>
          
          <div className="flex items-center gap-3">
             {lastUpdate && (
               <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                 <Database className="w-3 h-3" />
                 <span>Dados de: {lastUpdate}</span>
               </div>
             )}
             <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full border border-emerald-500/30">
                {validOpportunities} oportunidades
             </span>
          </div>
        </div>

        {/* Grid Content */}
        {loading && matches.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-96 bg-slate-800 rounded-xl border border-slate-700"></div>
            ))}
          </div>
        ) : matches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-slate-800 border-dashed">
             <TrophyIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
             <h3 className="text-xl font-bold text-slate-400">Nenhum jogo encontrado</h3>
             <p className="text-slate-500 max-w-md mx-auto mt-2">
               Tente clicar em "Atualizar" para forçar uma nova busca na web.
             </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <BankrollManager 
        isOpen={isBankrollModalOpen} 
        onClose={() => setIsBankrollModalOpen(false)}
        settings={bankrollSettings}
        onSave={handleSaveBankroll}
      />

    </div>
  );
};

// Simple Icon component for the logo
const TrophyIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

export default App;