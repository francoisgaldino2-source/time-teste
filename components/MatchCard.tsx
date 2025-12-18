
import React from 'react';
import { MatchAnalysis, RiskLevel, BankrollSettings } from '../types';
import { RefreshCw, Trophy, Clock, AlertCircle } from 'lucide-react';

interface Props {
  data: MatchAnalysis;
  bankroll: BankrollSettings;
  onReAnalyze: (id: string) => void;
  isUpdating: boolean;
}

const MatchCard: React.FC<Props> = ({ data, bankroll, onReAnalyze, isUpdating }) => {
  const stakePercentage = bankroll.stakes[data.riskLevel] || 0;
  const stakeAmount = (bankroll.totalBankroll * stakePercentage) / 100;

  const getRiskStyles = (risk: RiskLevel) => {
    switch (risk) {
      case RiskLevel.LOW: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case RiskLevel.MEDIUM: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case RiskLevel.HIGH: return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-slate-700/30 text-slate-400 border-slate-700';
    }
  };

  const [dateStr, timeStr] = data.date.split(' ');

  return (
    <div className={`group relative bg-slate-800/40 rounded-2xl border border-slate-700/50 backdrop-blur-sm overflow-hidden flex flex-col h-full transition-all hover:border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/5 ${!data.isValidOpportunity ? 'grayscale opacity-60' : ''}`}>
      {/* Header com Horário Gigante */}
      <div className="p-4 border-b border-slate-700/50 bg-slate-800/60 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest flex items-center gap-1">
            <Trophy className="w-3 h-3" /> {data.league}
          </span>
          <div className="text-3xl font-black text-white leading-none mt-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500" />
            {timeStr || 'LIVE'}
          </div>
          <span className="text-[10px] text-slate-500 font-bold ml-7">{dateStr}</span>
        </div>
        
        <div className={`px-2 py-1 rounded text-[10px] font-black border uppercase ${getRiskStyles(data.riskLevel)}`}>
          Risco {data.riskLevel}
        </div>
      </div>

      {/* Times */}
      <div className="p-5 space-y-3">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-white tracking-tight truncate">{data.homeTeam}</span>
            <span className="text-[10px] font-bold text-slate-600">MANDANTE</span>
          </div>
          <div className="h-px bg-slate-700/30 w-full my-1"></div>
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-slate-400 tracking-tight truncate">{data.awayTeam}</span>
            <span className="text-[10px] font-bold text-slate-600">VISITANTE</span>
          </div>
        </div>

        {/* Análise IA */}
        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50 mt-4 min-h-[80px]">
          <p className="text-slate-400 text-xs leading-relaxed italic">
            "{data.analysisText}"
          </p>
        </div>

        {/* Recomendação */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex flex-col items-center justify-center text-center">
          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Estratégia Recomendada</span>
          <span className="text-lg font-black text-emerald-400 uppercase italic">
            {data.isValidOpportunity ? data.recommendation : 'AGUARDAR'}
          </span>
        </div>

        {/* Stake */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 text-center">
            <span className="block text-[9px] text-slate-500 font-black uppercase mb-1">Sugerido ({stakePercentage}%)</span>
            <span className="text-lg font-mono font-bold text-white">
              {bankroll.currency} {stakeAmount.toFixed(2)}
            </span>
          </div>
          <button 
            onClick={() => onReAnalyze(data.matchId)}
            disabled={isUpdating}
            className="bg-slate-700 hover:bg-slate-600 rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
            title="Re-analisar"
          >
            <RefreshCw className={`w-5 h-5 text-slate-300 ${isUpdating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchCard;
