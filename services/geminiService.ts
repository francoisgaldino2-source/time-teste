
import { GoogleGenAI, Type } from "@google/genai";
import { MatchAnalysis, RiskLevel } from "../types";

const generateId = () => Math.random().toString(36).substr(2, 9);

const normalizeRiskLevel = (input: string): RiskLevel => {
  if (!input) return RiskLevel.UNKNOWN;
  const upper = input.toUpperCase().trim();
  if (upper.includes("BAIXO") || upper === "LOW") return RiskLevel.LOW;
  if (upper.includes("MÉDIO") || upper.includes("MEDIO") || upper === "MEDIUM") return RiskLevel.MEDIUM;
  if (upper.includes("ALTO") || upper === "HIGH") return RiskLevel.HIGH;
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
      date: { type: Type.STRING, description: "Formato: DD/MM HH:mm" },
      analysisText: { type: Type.STRING, description: "Análise curta focada no pior time em campo e por que ele é a zebra." },
      recommendation: { type: Type.STRING, description: "'LAY VISITANTE', 'LAY MANDANTE', 'LAY EMPATE' ou 'NÃO RECOMENDADO'" },
      riskLevel: { type: Type.STRING, description: "BAIXO, MÉDIO ou ALTO" },
      isValidOpportunity: { type: Type.BOOLEAN }
    },
    required: ["league", "homeTeam", "awayTeam", "date", "analysisText", "recommendation", "riskLevel", "isValidOpportunity"]
  }
};

async function searchRealMatches(): Promise<string> {
  // Criar instância logo antes do uso para pegar a chave atualizada
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const today = new Date().toLocaleDateString('pt-BR');
  
  const prompt = `
    Aja como um scout de futebol. Pesquise no Google os principais jogos de futebol que acontecem hoje (${today}) e amanhã.
    Foque em: Brasileirão Série A, Série B, Premier League e La Liga.
    Preciso dos nomes exatos dos times e horários.
    Retorne uma lista clara de confrontos.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview", // Modelo necessário para googleSearch
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Erro na busca de jogos:", error);
    throw error;
  }
}

export const fetchUpcomingMatchesAndAnalyze = async (onStatus?: (status: string) => void): Promise<MatchAnalysis[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    onStatus?.("Escaneando jogos de hoje via Google Search...");
    const matchesText = await searchRealMatches();
    
    onStatus?.("Analisando estatísticas e escalações com IA...");
    const prompt = `
      Com base nestes jogos reais:
      ${matchesText}

      Analise cada um para o mercado de LAY (Apostar contra).
      1. Identifique quem é a "zebra" (pior time) baseado em forma recente, desfalques e notícias.
      2. Recomende 'LAY [TIME]' para o time mais fraco.
      3. Defina Risco BAIXO se houver um favorito muito claro contra uma zebra em crise.
      4. Retorne APENAS o JSON seguindo o schema.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "Você é um analista profissional de trading esportivo focado em identificar zebras."
      }
    });

    const parsedData = JSON.parse(response.text || "[]");
    return parsedData.map((item: any) => ({
      ...item,
      matchId: generateId(),
      riskLevel: normalizeRiskLevel(item.riskLevel)
    }));
  } catch (error: any) {
    console.error("Erro na análise completa:", error);
    if (error.message?.includes("entity was not found")) {
      throw new Error("KEY_EXPIRED");
    }
    throw error;
  }
};

export const reAnalyzeMatch = async (match: MatchAnalysis): Promise<MatchAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `Re-analise agora: ${match.homeTeam} vs ${match.awayTeam}. Verifique notícias de última hora.`;
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
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
    return { 
      ...match,
      ...data,
      riskLevel: normalizeRiskLevel(data.riskLevel)
    };
  } catch (error) {
    return match;
  }
};
