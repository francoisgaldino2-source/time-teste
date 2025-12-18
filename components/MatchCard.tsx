import React from 'react';
import { MatchAnalysis, RiskLevel, BankrollSettings } from '../types';
import { RefreshCw, Trophy, AlertTriangle, TrendingDown, Clock } from 'lucide-react';

interface Props {
  data: MatchAnalysis;
  bankroll: BankrollSettings;
  onReAnalyze: (id: string) => void;
  isUpdating: boolean;
}

const MatchCard: React.FC<Props> = ({ data, bankroll, onReAnalyze, isUpdating }) => {
  
  // Calculate Stake Amount
  const stakePercentage = bankroll.stakes[data.riskLevel] || 0;
  const stakeAmount = (bankroll.totalBankroll * stakePercentage) / 100;

  // Determine Colors based on Risk and Recommendation
  const isRecommended = data.isValidOpportunity;
  
  const getRiskColor = (risk: RiskLevel) => {
    switch(risk) {
      case RiskLevel.LOW: return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case RiskLevel.MEDIUM: return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case RiskLevel.HIGH: return 'text-red-400 border-red-500/30 bg-red-500/10';
      default: return 'text-slate-400 border-slate-600 bg-slate-800';
    }
  };

  const getRiskLabelColor = (risk: RiskLevel) => {
    switch(risk) {
        case RiskLevel.LOW: return 'text-emerald-400';
        case RiskLevel.MEDIUM: return 'text-amber-400';
        case RiskLevel.HIGH: return 'text-red-400';
        default: return 'text-slate-400';
      }
  };

  // Date Parsing to highlight Time
  // Expected format: "DD/MM HH:mm"
  const dateParts = data.date.split(' ');
  const dateStr = dateParts[0] || data.date;
  const timeStr = dateParts.length > 1 ? dateParts[1] : '';

  return (
    <div className={`bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-slate-600 transition-all flex flex-col h-full ${!isRecommended ? 'opacity-70' : ''}`}>
      
      {/* Header: League, Time, Teams */}
      <div className="p-5 border-b border-slate-700/50 relative">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-500 tracking-wide uppercase">{data.league}</span>
          </div>
          
          {/* Highlighted Time */}
          {timeStr && (
            <div className="flex flex-col items-end">
                <span className="text-xl font-bold text-white leading-none">{timeStr}</span>
                <span className="text-[10px] text-slate-500 font-medium">{dateStr}</span>
            </div>
          )}
          {!timeStr && <span className="text-xs text-slate-500">{dateStr}</span>}
        </div>
        
        <div className="space-y-1 mt-2">
          <h3 className="text-lg font-bold text-white leading-tight">{data.homeTeam}</h3>
          <h3 className="text-lg font-bold text-slate-400 leading-tight">{data.awayTeam}</h3>
        </div>
      </div>

      {/* Body: Analysis */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 mb-4 flex-1">
          <p className="text-slate-300 text-sm leading-relaxed">
            {data.analysisText}
          </p>
        </div>

        {/* Action Button (Fake/Static for display) */}
        <div className={`w-full py-3 rounded-lg font-bold text-sm text-center mb-4 transition-colors uppercase tracking-wide flex items-center justify-center gap-2
          ${isRecommended 
            ? 'bg-slate-700 text-white shadow-lg border border-slate-600' 
            : 'bg-slate-700/30 text-slate-500 cursor-not-allowed'
          }`}>
          {isRecommended ? (
             <>
               <span>{data.recommendation}</span>
             </>
          ) : (
            'Não Recomendado'
          )}
        </div>

        {/* Stats Grid */}
        {isRecommended && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-900 rounded border border-slate-700 p-2 flex flex-col justify-center items-center">
               <span className="text-xs text-slate-500 uppercase font-bold">Stake Sugerida</span>
               <div className="flex items-baseline gap-1">
                 <span className="text-emerald-400 font-mono text-lg font-bold">
                    {bankroll.currency} {stakeAmount.toFixed(2)}
                 </span>
                 <span className="text-xs text-emerald-400/60">
                    ({stakePercentage}%)
                 </span>
               </div>
            </div>

            <div className={`bg-slate-900 rounded border p-2 flex flex-col justify-center items-center ${getRiskColor(data.riskLevel)} border-opacity-30 bg-opacity-10`}>
               <span className="text-xs opacity-70 uppercase font-bold mb-1">Risco</span>
               <div className={`flex items-center gap-1 font-bold ${getRiskLabelColor(data.riskLevel)}`}>
                  {data.riskLevel === RiskLevel.HIGH ? <AlertTriangle className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {data.riskLevel}
               </div>
            </div>
          </div>
        )}

        {/* Re-analyze Button */}
        <button 
          onClick={() => onReAnalyze(data.matchId)}
          disabled={isUpdating}
          className={`w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all
            ${isUpdating 
              ? 'bg-slate-700 text-slate-400 cursor-wait' 
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
            }`}
        >
          <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
          {isUpdating ? 'Analisando...' : 'Re-analisar com IA'}
        </button>
      </div>
    </div>
  );
};

export default MatchCard;
