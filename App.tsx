
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Trophy, Wallet, RefreshCw, Calendar, Search, AlertCircle, Info, ExternalLink, ShieldCheck } from 'lucide-react';
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
        setError("Nenhum jogo relevante encontrado nas próximas 48 horas.");
      }
    } catch (e) {
      setError("Falha na conexão com o serviço de análise.");
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
    <div className="min-h-screen flex flex-col">
      {/* Header Site Estilo Portal */}
      <nav className="sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded shadow-lg">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black italic tracking-tighter leading-none">LAY<span className="text-emerald-500">MASTER</span></h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">AI Prediction Engine</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="hidden md:flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-lg transition-all text-sm font-bold"
            >
              <Wallet className="w-4 h-4 text-emerald-400" />
              GERENCIAR BANCA
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="md:hidden p-2 bg-slate-800 rounded-lg"
            >
              <Wallet className="w-5 h-5 text-emerald-400" />
            </button>
            <button 
              onClick={() => load(true)}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 p-2 rounded-lg transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero / Intro Section (Estilo Site) */}
      <section className="bg-slate-900 border-b border-slate-800 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/20">SÉRIE A & B BRASIL</span>
                <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded border border-blue-500/20">EUROPEAN LEAGUES</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white italic uppercase leading-none">
                Análise de <span className="text-emerald-500 underline decoration-emerald-500/30">Oportunidades</span>
              </h2>
              <p className="text-slate-400 text-lg mt-4 max-w-2xl">
                Nossa IA processa dados de forma, desfalques e motivação para identificar o pior time em campo. Foco exclusivo em estratégias de <strong>LAY</strong> para exchanges.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800 min-w-[120px]">
                <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Banca Atual</span>
                <span className="text-xl font-black text-white">{bankroll.currency} {bankroll.totalBankroll.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-bold uppercase tracking-tight">Agenda de Jogos</h3>
          </div>
          <div className="text-xs font-bold text-slate-500 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
            {matches.length} JOGOS ANALISADOS
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-600">
            <div className="relative mb-6">
              <Search className="w-20 h-20 animate-pulse text-emerald-500/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            </div>
            <span className="text-sm font-black uppercase tracking-[0.2em] text-emerald-500">Sincronizando com a IA...</span>
          </div>
        ) : error ? (
          <div className="text-center py-24 bg-slate-800/20 rounded-3xl border-2 border-dashed border-slate-800">
            <AlertCircle className="w-16 h-16 text-red-500/50 mx-auto mb-4" />
            <h4 className="text-xl font-bold text-slate-300">{error}</h4>
            <p className="text-slate-500 mt-2">Nenhum dado disponível no momento.</p>
            <button onClick={() => load(true)} className="mt-6 px-8 py-3 bg-slate-800 hover:bg-slate-700 text-emerald-500 font-black uppercase text-xs rounded-xl border border-slate-700 transition-all">
              Tentar Novamente
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

      {/* Footer Profissional (Estilo Site) */}
      <footer className="bg-slate-900 border-t border-slate-800 py-12 px-4 mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-emerald-500 p-1.5 rounded">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-lg font-black italic tracking-tighter">LAYMASTER</h4>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                Plataforma de inteligência preditiva para mercados de intercâmbio esportivo. Não somos uma casa de apostas. Jogue com responsabilidade.
              </p>
            </div>
            <div>
              <h5 className="text-xs font-black text-white uppercase tracking-widest mb-6">Recursos</h5>
              <ul className="space-y-4 text-sm text-slate-400">
                <li className="flex items-center gap-2 hover:text-emerald-400 cursor-pointer transition-colors"><ShieldCheck className="w-4 h-4" /> Gestão de Banca</li>
                <li className="flex items-center gap-2 hover:text-emerald-400 cursor-pointer transition-colors"><Info className="w-4 h-4" /> Metodologia Lay</li>
                <li className="flex items-center gap-2 hover:text-emerald-400 cursor-pointer transition-colors"><ExternalLink className="w-4 h-4" /> Guia do Usuário</li>
              </ul>
            </div>
            <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-800">
              <h5 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-4">Aviso Legal</h5>
              <p className="text-[11px] text-slate-500 leading-normal">
                As sugestões fornecidas pela IA são baseadas em estatísticas e padrões de dados. Resultados passados não garantem lucros futuros. 18+.
              </p>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            <span>© {new Date().getFullYear()} LAYMASTER AI - TODOS OS DIREITOS RESERVADOS</span>
            <div className="flex gap-6">
              <span className="hover:text-slate-400 cursor-pointer">Privacidade</span>
              <span className="hover:text-slate-400 cursor-pointer">Termos de Uso</span>
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