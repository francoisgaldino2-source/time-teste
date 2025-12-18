
import React from 'react';
import { MatchAnalysis, RiskLevel, BankrollSettings } from '../types';
import { RefreshCw, Trophy, AlertTriangle, TrendingDown } from 'lucide-react';

interface Props {
  data: MatchAnalysis;
  bankroll: BankrollSettings;
  onReAnalyze: (id: string) => void;
  isUpdating: boolean;
}

const MatchCard: React.FC<Props> = ({ data, bankroll, onReAnalyze, isUpdating }) => {
  const stakePercentage = bankroll.stakes[data.riskLevel] || 0;
  const stakeAmount = (bankroll.totalBankroll * stakePercentage) / 100;
  const isRecommended = data.isValidOpportunity;
  
  const getRiskColor = (risk: RiskLevel) => {
    switch(risk) {
      case RiskLevel.LOW: return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case RiskLevel.MEDIUM: return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case RiskLevel.HIGH: return 'text-red-400 border-red-500/30 bg-red-500/10';
      default: return 'text-slate-400 border-slate-600 bg-slate-800';
    }
  };

  const dateParts = data.date.split(' ');
  const dateStr = dateParts[0] || '';
  const timeStr = dateParts.length > 1 ? dateParts[1] : '';

  return (
    <div className={`bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-slate-600 transition-all flex flex-col h-full ${!isRecommended ? 'opacity-70' : ''}`}>
      <div className="p-5 border-b border-slate-700/50 relative bg-slate-800/40">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] font-bold text-emerald-500 tracking-wider uppercase truncate max-w-[120px]">{data.league}</span>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-black text-white leading-none tracking-tighter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
              {timeStr}
            </div>
            <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">
              {dateStr}
            </div>
          </div>
        </div>
        
        <div className="space-y-0.5 mt-1">
          <h3 className="text-lg font-bold text-white truncate">{data.homeTeam}</h3>
          <div className="text-xs text-slate-500 font-bold">vs</div>
          <h3 className="text-lg font-bold text-slate-400 truncate">{data.awayTeam}</h3>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col bg-slate-900/20">
        <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50 mb-4 flex-1">
          <p className="text-slate-300 text-xs leading-relaxed italic">
            "{data.analysisText}"
          </p>
        </div>

        <div className={`w-full py-2.5 rounded-lg font-black text-xs text-center mb-4 transition-colors uppercase tracking-widest border
          ${isRecommended 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
            : 'bg-slate-700/30 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}>
          {isRecommended ? data.recommendation : 'Não Recomendado'}
        </div>

        {isRecommended && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-slate-900 rounded border border-slate-700 p-2 flex flex-col justify-center items-center">
               <span className="text-[9px] text-slate-500 uppercase font-black">Stake</span>
               <div className="text-emerald-400 font-mono text-sm font-bold">
                  {bankroll.currency} {stakeAmount.toFixed(2)}
               </div>
            </div>

            <div className={`bg-slate-900 rounded border p-2 flex flex-col justify-center items-center ${getRiskColor(data.riskLevel)} border-opacity-30 bg-opacity-10`}>
               <span className="text-[9px] opacity-70 uppercase font-black">Risco</span>
               <div className="text-[10px] font-black uppercase">
                  {data.riskLevel}
               </div>
            </div>
          </div>
        )}

        <button 
          onClick={() => onReAnalyze(data.matchId)}
          disabled={isUpdating}
          className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all
            ${isUpdating 
              ? 'bg-slate-700 text-slate-400' 
              : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}
        >
          <RefreshCw className={`w-3 h-3 ${isUpdating ? 'animate-spin' : ''}`} />
          {isUpdating ? 'PROCESSANDO...' : 'RE-ANALISAR'}
        </button>
      </div>
    </div>
  );
};

export default MatchCard;
