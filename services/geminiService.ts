import { GoogleGenAI } from "@google/genai";
import { StockData } from "../types";

// Fallback data: Top Brazilian stocks (B3)
const FALLBACK_DATA: StockData[] = [
  { ticker: "VALE3", price: 60.50, changePercent: -1.2, name: "Vale" },
  { ticker: "PETR4", price: 36.20, changePercent: 0.8, name: "Petrobras" },
  { ticker: "ITUB4", price: 34.10, changePercent: 1.5, name: "Itaú Unibanco" },
  { ticker: "BBDC4", price: 13.80, changePercent: -0.5, name: "Bradesco" },
  { ticker: "BBAS3", price: 27.90, changePercent: 2.1, name: "Banco do Brasil" },
  { ticker: "ABEV3", price: 12.50, changePercent: 0.3, name: "Ambev" },
  { ticker: "WEGE3", price: 38.40, changePercent: 1.8, name: "WEG" },
  { ticker: "SUZB3", price: 54.20, changePercent: -0.9, name: "Suzano" },
  { ticker: "BPAC11", price: 36.50, changePercent: 1.2, name: "BTG Pactual" },
  { ticker: "ELET3", price: 42.10, changePercent: -1.5, name: "Eletrobras" },
  { ticker: "RENT3", price: 51.80, changePercent: 2.5, name: "Localiza" },
  { ticker: "JBSS3", price: 22.40, changePercent: 0.7, name: "JBS" },
];

export const fetchRealStockData = async (): Promise<{ data: StockData[], sources: string[] }> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.warn("No API_KEY found. Using fallback simulated data.");
    return { data: FALLBACK_DATA, sources: ["Simulation Mode (No API Key)"] };
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    // Improved prompt to strictly request JSON array without markdown
    const prompt = `
      Retrieve real-time stock prices (BRL) and daily percentage changes for the top 12 largest companies on B3 (Brazil).
      
      Output strictly a raw JSON array containing the data. 
      Do not use Markdown code blocks. 
      Do not include any introductory or concluding text.
      
      Example format:
      [
        { "ticker": "VALE3", "name": "Vale", "price": 60.50, "changePercent": -1.2 },
        { "ticker": "PETR4", "name": "Petrobras", "price": 36.20, "changePercent": 0.8 }
      ]
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    let jsonText = response.text || "";
    
    // 1. Remove Markdown code blocks if present
    jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();

    // 2. Extract JSON array substring (find first '[' and last ']')
    const firstBracket = jsonText.indexOf('[');
    const lastBracket = jsonText.lastIndexOf(']');

    if (firstBracket !== -1 && lastBracket !== -1) {
      jsonText = jsonText.substring(firstBracket, lastBracket + 1);
    } else {
      console.warn("Raw response text:", response.text);
      throw new Error("No JSON array structure found in response.");
    }
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .map(c => c.web?.uri)
      .filter((uri): uri is string => !!uri);

    try {
        const parsedData = JSON.parse(jsonText);
        
        if (Array.isArray(parsedData)) {
          let finalData = parsedData as StockData[];

          // Validate items have required fields
          finalData = finalData.filter(item => 
            item && typeof item.ticker === 'string' && typeof item.price === 'number'
          );

          // 1. Truncate
          if (finalData.length > 12) {
            finalData = finalData.slice(0, 12);
          }

          // 2. Supplement
          if (finalData.length < 12) {
            const needed = 12 - finalData.length;
            const existingTickers = new Set(finalData.map(item => item.ticker.toUpperCase()));
            
            const supplements = FALLBACK_DATA.filter(
              item => !existingTickers.has(item.ticker.toUpperCase())
            ).slice(0, needed);

            finalData = [...finalData, ...supplements];
          }

          return { data: finalData, sources };
        } else {
          throw new Error("Parsed JSON is not an array");
        }
    } catch (parseError) {
        console.error("JSON Parse Error:", parseError, "Cleaned Text:", jsonText);
        throw parseError; // Re-throw to hit the outer catch and return fallback
    }

  } catch (error) {
    console.error("Failed to fetch real data via Gemini:", error);
    // Return fallback data gracefully on error so the app doesn't break
    return { data: FALLBACK_DATA, sources: ["Fallback (API Error)"] };
  }
};