import { GoogleGenAI, Type, Schema } from "@google/genai";
import { MatchAnalysis, RiskLevel } from "../types";

// Helper for ID generation
const generateId = () => Math.random().toString(36).substr(2, 9);

const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

// Helper to normalize risk levels from AI text to Enum
const normalizeRiskLevel = (input: string): RiskLevel => {
  if (!input) return RiskLevel.UNKNOWN;
  const upper = input.toUpperCase().trim();
  
  if (upper.includes("BAIXO") || upper === "LOW") return RiskLevel.LOW;
  if (upper.includes("MÉDIO") || upper.includes("MEDIO") || upper === "MEDIUM") return RiskLevel.MEDIUM;
  if (upper.includes("ALTO") || upper === "HIGH") return RiskLevel.HIGH;
  
  return RiskLevel.UNKNOWN;
};

// Schema for the analysis step
const analysisSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      league: { type: Type.STRING },
      homeTeam: { type: Type.STRING },
      awayTeam: { type: Type.STRING },
      date: { type: Type.STRING, description: "Format: DD/MM HH:mm" },
      analysisText: { type: Type.STRING, description: "Analysis focusing on form, injuries, and motivation. Max 40 words." },
      recommendation: { type: Type.STRING, description: "'LAY VISITANTE', 'LAY MANDANTE', 'LAY EMPATE', or 'NÃO RECOMENDADO'" },
      riskLevel: { type: Type.STRING, enum: ["BAIXO", "MÉDIO", "ALTO"] },
      isValidOpportunity: { type: Type.BOOLEAN }
    },
    required: ["league", "homeTeam", "awayTeam", "date", "analysisText", "recommendation", "riskLevel", "isValidOpportunity"]
  }
};

/**
 * Step 1: Use Gemini with Google Search to get the real schedule text.
 * We do NOT use JSON schema here because the search tool and schema don't always mix well in one turn.
 */
async function searchRealMatches(): Promise<string> {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
  const todayStr = today.toLocaleDateString('pt-BR', dateOptions);
  const tomorrowStr = tomorrow.toLocaleDateString('pt-BR', dateOptions);

  const prompt = `
    Find the football match schedule for today (${todayStr}) and tomorrow (${tomorrowStr}).
    Focus on these leagues:
    - Brasileirão Série A (Brazil)
    - Brasileirão Série B (Brazil)
    - Premier League (England)
    - La Liga (Spain)
    - Serie A (Italy)
    - Bundesliga (Germany)
    - Champions League / Europa League

    List the matches in this format: "League: Home Team vs Away Team (Time)"
    Do not analyze them yet, just list the schedule found on Google.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Enable Google Search to find real games
        responseMimeType: "text/plain"
      }
    });

    // Extract text and any grounding metadata (URLs)
    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    // We could log sources here if needed
    if (groundingChunks) {
      console.log("Sources found:", groundingChunks);
    }

    return text;
  } catch (error) {
    console.error("Search step failed:", error);
    return "";
  }
}

/**
 * Step 2: Feed the search results into Gemini to generate the JSON analysis.
 */
export const fetchUpcomingMatchesAndAnalyze = async (): Promise<MatchAnalysis[]> => {
  try {
    // 1. Get Real Data
    let matchesText = await searchRealMatches();

    // Fallback if search returns empty (e.g., API limits or errors)
    if (!matchesText || matchesText.length < 50) {
      console.warn("Search returned little data, using fallback generation.");
      matchesText = "Generate a list of 6 realistic upcoming matches for Brasileirão Série A/B or major European leagues for today.";
    }

    // 2. Analyze and Format as JSON
    const prompt = `
      You are an expert Betfair Exchange analyst (Lay Betting).
      
      Here is the list of UPCOMING MATCHES found via search:
      ---
      ${matchesText}
      ---

      Task:
      1. Select the 6-9 most relevant matches. Prioritize Brasileirão Série A and B if available.
      2. Analyze the 'Last 5 Games' form and injuries.
      3. STRATEGY (Lay ao pior em campo / Lay Empate):
         - Identify the WORST team on the field (weakest form/squad). Recommend betting against them (LAY MANDANTE if Home is worst, LAY VISITANTE if Away is worst).
         - If the match is likely to have a winner (decisive game) and a draw is unlikely, recommend 'LAY EMPATE'.
      4. Output STRICT JSON using the provided schema.
      5. Translate everything to Portuguese.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "You are LayMaster AI. Identify the worst team and recommend Laying them. Or Lay Draw if applicable."
      }
    });

    const rawJSON = response.text;
    if (!rawJSON) return [];

    const parsedData = JSON.parse(rawJSON);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return parsedData.map((item: any) => ({
      ...item,
      matchId: generateId(),
      riskLevel: normalizeRiskLevel(item.riskLevel)
    }));

  } catch (error) {
    console.error("Analysis failed:", error);
    return [];
  }
};

export const reAnalyzeMatch = async (match: MatchAnalysis): Promise<MatchAnalysis> => {
  try {
    const prompt = `
      Re-analyze this match for Betfair Exchange (Lay Betting): 
      ${match.homeTeam} vs ${match.awayTeam} (${match.league}).
      
      Current Analysis: ${match.analysisText}
      
      Task:
      1. Re-evaluate form (Last 5 games).
      2. Identify the worst team or if a Draw is unlikely.
      3. Recommend: 'LAY MANDANTE', 'LAY VISITANTE', or 'LAY EMPATE'.
      4. Return a single JSON object.
    `;

    const singleItemSchema: Schema = {
       type: Type.OBJECT,
       properties: {
          league: { type: Type.STRING },
          homeTeam: { type: Type.STRING },
          awayTeam: { type: Type.STRING },
          date: { type: Type.STRING },
          analysisText: { type: Type.STRING },
          recommendation: { type: Type.STRING },
          riskLevel: { type: Type.STRING, enum: ["BAIXO", "MÉDIO", "ALTO"] },
          isValidOpportunity: { type: Type.BOOLEAN }
       }
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: singleItemSchema
      }
    });

    const data = JSON.parse(response.text || "{}");
    return { 
      ...data, 
      matchId: match.matchId,
      riskLevel: normalizeRiskLevel(data.riskLevel)
    };

  } catch (error) {
    console.error("Re-analysis failed", error);
    return match;
  }
};