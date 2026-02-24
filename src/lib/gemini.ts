/**
 * Client-side AI helpers that route through our server API routes.
 * API keys are kept server-side only.
 */

/**
 * General-purpose text generation via /api/ai/generate.
 * Used by Notes (summarise) and QuizArchitect (generate quiz JSON).
 */
export async function generateWithFallback(prompt: string): Promise<string> {
  const res = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error || `AI request failed (${res.status})`);
  }

  return data.response;
}

/**
 * Multimodal chat generation via /api/ai/chat.
 * Supports conversation history, base64 images, and extracted PDF text.
 */
export async function generateChat(opts: {
  messages: { role: "user" | "assistant"; content: string }[];
  imageBase64?: string;
  imageMimeType?: string;
  pdfText?: string;
}): Promise<string> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error || `AI chat request failed (${res.status})`);
  }

  return data.response;
}
