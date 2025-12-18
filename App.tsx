import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Trophy, Wallet, RefreshCw, Calendar, Search, AlertCircle, Info, ChevronRight, BarChart3, ShieldCheck } from 'lucide-react';
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

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUpcomingMatchesAndAnalyze();
      if (data && data.length > 0) {
        setMatches(data);
      } else if (!force) {
        setError("Buscando novas oportunidades...");
      }
    } catch (e) {
      setError("Falha temporária na análise da IA.");
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navbar Profissional */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter leading-none">LAY<span className="text-emerald-500">MASTER</span></h1>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">AI Prediction Platform</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-slate-400">
              <a href="#analises" className="hover:text-emerald-400 transition-colors">Análises</a>
              <a href="#metodologia" className="hover:text-emerald-400 transition-colors">Metodologia</a>
              <a href="#gestao" onClick={() => { setIsModalOpen(true); }} className="hover:text-emerald-400 transition-colors cursor-pointer">Minha Banca</a>
            </nav>
            <button 
              onClick={() => load(true)}
              className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl border border-slate-700 transition-all"
              title="Atualizar Jogos"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-emerald-500' : 'text-slate-300'}`} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 px-4 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]"></div>
        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-6">
              <ShieldCheck className="w-3 h-3" /> Trading Esportivo Inteligente
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-white italic uppercase leading-none mb-6">
              Aposte contra a <br />
              <span className="text-emerald-500">Zebra</span> com IA.
            </h2>
            <p className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed mb-10">
              Identificamos times em má fase, com desfalques críticos e tendências técnicas negativas para sugerir as melhores oportunidades de <strong>Lay</strong> (apostar contra) nas principais ligas do mundo.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#analises" className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs rounded-xl shadow-xl shadow-emerald-900/20 flex items-center gap-2 transition-all">
                Ver Análises de Hoje <ChevronRight className="w-4 h-4" />
              </a>
              <div className="flex items-center gap-3 px-6 py-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <BarChart3 className="w-5 h-5 text-emerald-500" />
                <div className="text-left leading-none">
                  <span className="block text-white font-bold text-sm">Banca: {bankroll.currency} {bankroll.totalBankroll.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Pronto para operar</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Analysis Hub */}
      <main id="analises" className="flex-1 max-w-7xl mx-auto w-full px-4 py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              <h3 className="text-xl font-black uppercase italic text-white tracking-tight">Oportunidades Ativas</h3>
            </div>
            <p className="text-slate-500 text-sm">Jogos monitorados em tempo real pela Gemini 3 Pro.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
            <div className="px-4 py-2 text-center">
              <span className="block text-[10px] text-slate-500 font-black uppercase mb-1">Total Analisado</span>
              <span className="text-lg font-black text-white">{matches.length}</span>
            </div>
            <div className="w-px h-8 bg-slate-800"></div>
            <div className="px-4 py-2 text-center">
              <span className="block text-[10px] text-slate-500 font-black uppercase mb-1">Qualificadas</span>
              <span className="text-lg font-black text-emerald-400">{matches.filter(m => m.isValidOpportunity).length}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-600">
            <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
            <span className="text-xs font-black uppercase tracking-[0.3em] text-emerald-500">Escaneando Mercados...</span>
          </div>
        ) : error ? (
          <div className="text-center py-24 bg-slate-900/30 rounded-[2rem] border-2 border-dashed border-slate-800">
            <Search className="w-16 h-16 text-slate-800 mx-auto mb-4" />
            <h4 className="text-xl font-bold text-slate-500 uppercase tracking-widest">{error}</h4>
            <button onClick={() => load(true)} className="mt-8 px-8 py-3 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 rounded-xl font-black uppercase text-xs hover:bg-emerald-600/20 transition-all">
              Tentar Buscar Novamente
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

      {/* Footer Profissional */}
      <footer className="bg-slate-900 border-t border-slate-800 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <Trophy className="w-6 h-6 text-emerald-500" />
                <h4 className="text-xl font-black italic tracking-tighter text-white">LAYMASTER <span className="text-emerald-500">AI</span></h4>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                A tecnologia por trás do LayMaster utiliza LLMs de última geração para processar volumes massivos de notícias, escalações e estatísticas de forma instantânea, trazendo para você as melhores entradas de valor no mercado de Exchange.
              </p>
            </div>
            
            <div>
              <h5 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-6">Navegação</h5>
              <ul className="space-y-4 text-sm font-bold text-slate-500">
                <li className="hover:text-emerald-400 cursor-pointer transition-colors">Termos de Uso</li>
                <li className="hover:text-emerald-400 cursor-pointer transition-colors">Política de Privacidade</li>
                <li className="hover:text-emerald-400 cursor-pointer transition-colors">Aviso de Risco</li>
              </ul>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
              <h5 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Info className="w-3 h-3" /> Aviso Legal
              </h5>
              <p className="text-[10px] text-slate-500 leading-normal uppercase font-bold">
                O futebol é imprevisível. Nossas análises são probabilísticas e não garantem lucros. Nunca aposte o dinheiro que você não pode perder. 18+
              </p>
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">
            <span>© {new Date().getFullYear()} LayMaster AI - Otimizado para Alta Performance</span>
            <div className="flex gap-8">
              <span className="hover:text-slate-400 cursor-pointer transition-colors">Instagram</span>
              <span className="hover:text-slate-400 cursor-pointer transition-colors">Telegram</span>
            </div>
          </div>
        </div>
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