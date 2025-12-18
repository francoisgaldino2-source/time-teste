
import { GoogleGenAI, Type } from "@google/genai";
import { MatchAnalysis, RiskLevel } from "../types";

const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper para normalizar o nível de risco vindo da IA
const normalizeRiskLevel = (input: string): RiskLevel => {
  if (!input) return RiskLevel.UNKNOWN;
  const upper = input.toUpperCase().trim();
  if (upper.includes("BAIXO") || upper === "LOW") return RiskLevel.LOW;
  if (upper.includes("MÉDIO") || upper.includes("MEDIO") || upper === "MEDIUM") return RiskLevel.MEDIUM;
  if (upper.includes("ALTO") || upper === "HIGH") return RiskLevel.HIGH;
  return RiskLevel.UNKNOWN;
};

// Schema simplificado seguindo as novas diretrizes
const analysisSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      league: { type: Type.STRING },
      homeTeam: { type: Type.STRING },
      awayTeam: { type: Type.STRING },
      date: { type: Type.STRING, description: "Formato: DD/MM HH:mm" },
      analysisText: { type: Type.STRING, description: "Análise curta focada no pior time em campo." },
      recommendation: { type: Type.STRING, description: "'LAY VISITANTE', 'LAY MANDANTE', 'LAY EMPATE' ou 'NÃO RECOMENDADO'" },
      riskLevel: { type: Type.STRING, description: "BAIXO, MÉDIO ou ALTO" },
      isValidOpportunity: { type: Type.BOOLEAN }
    },
    required: ["league", "homeTeam", "awayTeam", "date", "analysisText", "recommendation", "riskLevel", "isValidOpportunity"]
  }
};

async function searchRealMatches(): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const today = new Date().toLocaleDateString('pt-BR');
  
  const prompt = `
    Encontre os jogos de futebol para hoje (${today}) e amanhã.
    Foque obrigatoriamente em:
    - Brasileirão Série A
    - Brasileirão Série B
    - Premier League, La Liga, Serie A Italiana e Champions League.
    
    Liste os jogos no formato: "Liga: Mandante vs Visitante (Horário HH:mm)".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Erro na busca de jogos:", error);
    return "";
  }
}

export const fetchUpcomingMatchesAndAnalyze = async (): Promise<MatchAnalysis[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const matchesText = await searchRealMatches();
    
    const prompt = `
      Com base nestes jogos reais encontrados:
      ${matchesText}

      Analise cada um para o mercado de Lay (Exchange).
      Critérios:
      1. Identifique o PIOR TIME em campo (forma técnica, desfalques, motivação).
      2. Recomende 'LAY MANDANTE' se o mandante for o pior, ou 'LAY VISITANTE' se o visitante for o pior.
      3. Se o jogo for muito parelho mas com tendência a vitória de alguém, considere 'LAY EMPATE'.
      4. Priorize jogos do Brasileirão Série A e B.
      5. Retorne JSON conforme o schema.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "Você é um analista especialista em Lay Betting. Seu foco é identificar o time mais fraco em campo para apostar contra ele."
      }
    });

    const parsedData = JSON.parse(response.text || "[]");
    return parsedData.map((item: any) => ({
      ...item,
      matchId: generateId(),
      riskLevel: normalizeRiskLevel(item.riskLevel)
    }));
  } catch (error) {
    console.error("Erro na análise:", error);
    return [];
  }
};

export const reAnalyzeMatch = async (match: MatchAnalysis): Promise<MatchAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `Re-analise este jogo focando no Lay ao pior em campo: ${match.homeTeam} vs ${match.awayTeam}.`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            league: { type: Type.STRING },
            homeTeam: { type: Type.STRING },
            awayTeam: { type: Type.STRING },
            date: { type: Type.STRING },
            analysisText: { type: Type.STRING },
            recommendation: { type: Type.STRING },
            riskLevel: { type: Type.STRING },
            isValidOpportunity: { type: Type.BOOLEAN }
          }
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    return { 
      ...data, 
      matchId: match.matchId,
      riskLevel: normalizeRiskLevel(data.riskLevel)
    };
  } catch (error) {
    return match;
  }
};
