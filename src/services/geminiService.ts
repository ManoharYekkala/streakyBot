// src/services/geminiService.ts (now using Groq)

import Groq from "groq-sdk";

let groq: Groq | null = null;

export function initGemini(): boolean {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("GROQ_API_KEY not set - loveme will use fallback messages");
    return false;
  }
  groq = new Groq({ apiKey });
  return true;
}

export async function generateLoveMessage(
  userName: string,
  partnerName: string,
): Promise<{ title: string; message: string; emoji: string } | null> {
  if (!groq) {
    return null;
  }

  try {
    const prompt = `You are ${partnerName}, writing a flirty love message to your partner ${userName}.

Requirements:
- Write as if YOU (${partnerName}) are speaking directly to ${userName}
- Be EXTRA cheesy, romantic, and flirty (like a Bollywood love dialogue!)
- Use sweet nicknames, butterflies-in-stomach vibes, heart-melting lines
- Make them blush! Be bold and expressive with your love
- Use ${userName}'s name naturally
- NO tech/coding/gaming references - pure romance only
- Keep the message under 200 characters

Examples of the vibe:
- "My heart skips a beat every time I see your name"
- "You're the reason I believe in love at first sight"
- "I fall for you a little more every single day"

Respond in this exact JSON format only, no markdown:
{"title": "short romantic title (max 5 words)", "message": "the cheesy flirty message", "emoji": "1-2 love emojis"}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant", // Fast and free
      temperature: 0.9,
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0]?.message?.content || "";

    // Robust JSON extraction: find the first { and last }
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : response;

    const parsed = JSON.parse(jsonString);
    if (parsed.title && parsed.message && parsed.emoji) {
      return {
        title: parsed.title,
        message: parsed.message,
        emoji: parsed.emoji,
      };
    }

    return null;
  } catch (error) {
    console.error("Groq API error:", error);
    return null;
  }
}
