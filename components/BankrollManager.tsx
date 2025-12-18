import React, { useState } from 'react';
import { BankrollSettings, RiskLevel } from '../types';
import { X, Save, Wallet } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: BankrollSettings;
  onSave: (newSettings: BankrollSettings) => void;
}

const BankrollManager: React.FC<Props> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<BankrollSettings>(settings);

  // Sync local state when settings prop updates (e.g. initial load)
  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  const parseNumber = (value: string): number => {
    // Handle comma as decimal separator for PT-BR user friendliness
    const normalized = value.replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  };

  const handleStakeChange = (risk: RiskLevel, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      stakes: {
        ...prev.stakes,
        [risk]: parseNumber(value)
      }
    }));
  };

  const handleTotalChange = (value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      totalBankroll: parseNumber(value)
    }));
  };

  const saveAndClose = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md shadow-2xl overflow-hidden">
        
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-2 text-emerald-400">
            <Wallet className="w-6 h-6" />
            <h2 className="text-xl font-bold text-white">Gerenciar Banca</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Total Bankroll */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Banca Total ({localSettings.currency})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 font-bold">$</span>
              <input 
                type="text" 
                inputMode="decimal"
                defaultValue={localSettings.totalBankroll}
                onBlur={(e) => handleTotalChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 pl-8 pr-4 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="Ex: 1000"
              />
            </div>
          </div>

          {/* Risk Stakes */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Definição de Stake por Risco (%)</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-slate-900/50 p-3 rounded-lg border border-emerald-900/30">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-emerald-400 font-medium text-sm">Risco BAIXO</label>
                  <span className="text-xs text-slate-500">Sugestão: 2-5%</span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    inputMode="decimal"
                    defaultValue={localSettings.stakes[RiskLevel.LOW]}
                    onBlur={(e) => handleStakeChange(RiskLevel.LOW, e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-white text-sm focus:border-emerald-500 outline-none"
                    placeholder="Ex: 4,0"
                  />
                  <span className="text-slate-400 text-sm">%</span>
                </div>
              </div>

              <div className="bg-slate-900/50 p-3 rounded-lg border border-amber-900/30">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-amber-400 font-medium text-sm">Risco MÉDIO</label>
                  <span className="text-xs text-slate-500">Sugestão: 1-2%</span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    inputMode="decimal"
                    defaultValue={localSettings.stakes[RiskLevel.MEDIUM]}
                    onBlur={(e) => handleStakeChange(RiskLevel.MEDIUM, e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-white text-sm focus:border-amber-500 outline-none"
                    placeholder="Ex: 2,0"
                  />
                  <span className="text-slate-400 text-sm">%</span>
                </div>
              </div>

              <div className="bg-slate-900/50 p-3 rounded-lg border border-red-900/30">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-red-400 font-medium text-sm">Risco ALTO</label>
                  <span className="text-xs text-slate-500">Sugestão: 0.5-1%</span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    inputMode="decimal"
                    defaultValue={localSettings.stakes[RiskLevel.HIGH]}
                    onBlur={(e) => handleStakeChange(RiskLevel.HIGH, e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-white text-sm focus:border-red-500 outline-none"
                    placeholder="Ex: 1,0"
                  />
                  <span className="text-slate-400 text-sm">%</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="p-6 pt-0">
          <button 
            onClick={saveAndClose}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3 rounded-lg shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Save className="w-5 h-5" />
            Salvar Configurações
          </button>
        </div>

      </div>
    </div>
  );
};

export default BankrollManager;