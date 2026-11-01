import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

/**
 * Returns a configured ChatGoogleGenerativeAI model for evaluation judging,
 * or undefined if GEMINI_API_KEY is not set.
 */
export function getJudgeModel(): ChatGoogleGenerativeAI | undefined {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0 || apiKey.includes('your_gemini_api_key')) {
    return undefined;
  }

  // Use fast, stable Gemini flash model for evaluation judging
  const modelName = process.env.GEMINI_EVAL_MODEL || process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

  return new ChatGoogleGenerativeAI({
    apiKey,
    model: modelName,
    temperature: 0.0,
    maxRetries: 1,
  });
}

/**
 * Helper to safely extract JSON from LLM markdown code blocks or raw text.
 */
export function parseJudgeJson<T>(raw: string): T | undefined {
  try {
    const cleaned = raw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}
