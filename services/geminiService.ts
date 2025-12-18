
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
  const prompt = `ENCONTRE TODOS OS JOGOS de hoje e amanhã, PRIORIZANDO ABSOLUTAMENTE o Brasileirão Série A e Série B. Inclua também grandes ligas europeias se houver jogos. Retorne no formato: Liga | Mandante vs Visitante | Horário HH:mm.`;
  
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
    Com base nestes jogos reais encontrados na web: ${matchesData}
    
    Analise cada um para o mercado de LAY (apostar contra).
    CRITÉRIOS:
    1. Identifique o pior time (pior forma, desfalques, má fase).
    2. Recomende 'LAY MANDANTE', 'LAY VISITANTE' ou 'LAY EMPATE'.
    3. Se o jogo for perigoso, marque 'isValidOpportunity' como false.
    4. FOCO: Série A e B do Brasileirão.
    
    Retorne apenas o JSON puro seguindo o schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "Você é o maior especialista em trading esportivo do Brasil, focado em identificar zebras e times em má fase para apostar contra no intercâmbio."
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
  const prompt = `Re-analise em profundidade agora este jogo: ${match.homeTeam} vs ${match.awayTeam} (${match.league}). Busque notícias de última hora sobre desfalques ou crises nos clubes e ajuste a recomendação de LAY.`;
  
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
        },
        tools: [{ googleSearch: {} }]
      }
    });
    const data = JSON.parse(response.text || "{}");
    return { ...match, ...data, riskLevel: normalizeRiskLevel(data.riskLevel) };
  } catch (e) {
    return match;
  }
};