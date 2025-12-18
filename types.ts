export enum RiskLevel {
  LOW = "BAIXO",
  MEDIUM = "MÉDIO",
  HIGH = "ALTO",
  UNKNOWN = "DESCONHECIDO"
}

export interface MatchAnalysis {
  matchId: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  analysisText: string;
  recommendation: string; // e.g., "LAY VISITANTE", "LAY MANDANTE", "LAY EMPATE", "NÃO RECOMENDADO"
  riskLevel: RiskLevel;
  isValidOpportunity: boolean; // If false, likely "NÃO RECOMENDADO"
}

export interface BankrollSettings {
  totalBankroll: number;
  currency: string;
  stakes: {
    [RiskLevel.LOW]: number; // Percentage, e.g., 2.5
    [RiskLevel.MEDIUM]: number;
    [RiskLevel.HIGH]: number;
    [RiskLevel.UNKNOWN]: number;
  };
}

export const DEFAULT_BANKROLL: BankrollSettings = {
  totalBankroll: 1000,
  currency: "R$",
  stakes: {
    [RiskLevel.LOW]: 4.0, // 4% of bank
    [RiskLevel.MEDIUM]: 2.0, // 2% of bank
    [RiskLevel.HIGH]: 1.0, // 1% of bank
    [RiskLevel.UNKNOWN]: 0,
  }
};
