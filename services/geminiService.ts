
import { GoogleGenAI, Type } from "@google/genai";
import { MatchAnalysis, RiskLevel } from "../types";

const generateId = () => Math.random().toString(36).substring(2, 11);

const normalizeRiskLevel = (input: string): RiskLevel => {
  if (!input) return RiskLevel.UNKNOWN;
  const val = input.toUpperCase();
  if (val.includes("BAIXO")) return RiskLevel.LOW;
  if (val.includes("MÉDIO") || val.includes("MEDIO")) return RiskLevel.MEDIUM;
  if (val.includes("ALTO")) return RiskLevel.HIGH;
  return RiskLevel.UNKNOWN;
};

const analysisSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      league: { type: Type.STRING },
      homeTeam: { type: Type.STRING },
      awayTeam: { type: Type.STRING },
      date: { type: Type.STRING, description: "Formato DD/MM HH:mm" },
      analysisText: { type: Type.STRING },
      recommendation: { type: Type.STRING },
      riskLevel: { type: Type.STRING },
      isValidOpportunity: { type: Type.BOOLEAN }
    },
    required: ["league", "homeTeam", "awayTeam", "date", "analysisText", "recommendation", "riskLevel", "isValidOpportunity"]
  }
};

async function searchMatches(): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Liste os jogos de futebol de hoje e amanhã, focando principalmente no Brasileirão Série A, Série B e grandes ligas europeias. Retorne no formato: Liga | Mandante vs Visitante | Horário HH:mm.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    return response.text || "";
  } catch (e) {
    console.error("Search error:", e);
    return "";
  }
}

export const fetchUpcomingMatchesAndAnalyze = async (): Promise<MatchAnalysis[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const matchesData = await searchMatches();
  
  if (!matchesData) return [];

  const prompt = `
    Com base nestes jogos: ${matchesData}
    Analise cada um para o mercado de LAY (apostar contra).
    Identifique o pior time em campo baseado em forma e desfalques.
    Recomende 'LAY MANDANTE', 'LAY VISITANTE' ou 'LAY EMPATE'.
    Foque especialmente na Série A e B do Brasil.
    Retorne apenas o JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "Você é um especialista em apostas contra (Lay) no futebol brasileiro e europeu."
      }
    });

    const results = JSON.parse(response.text || "[]");
    return results.map((r: any) => ({
      ...r,
      matchId: generateId(),
      riskLevel: normalizeRiskLevel(r.riskLevel)
    }));
  } catch (e) {
    console.error("Analysis error:", e);
    return [];
  }
};

export const reAnalyzeMatch = async (match: MatchAnalysis): Promise<MatchAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Re-analise agora: ${match.homeTeam} vs ${match.awayTeam} (${match.league}). Foco total no pior em campo.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysisText: { type: Type.STRING },
            recommendation: { type: Type.STRING },
            riskLevel: { type: Type.STRING },
            isValidOpportunity: { type: Type.BOOLEAN }
          }
        }
      }
    });
    const data = JSON.parse(response.text || "{}");
    return { ...match, ...data, riskLevel: normalizeRiskLevel(data.riskLevel) };
  } catch (e) {
    return match;
  }
};
