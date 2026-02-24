import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const PRIMARY_MODEL = "google/gemini-2.0-flash-001";
const FALLBACK_MODEL = "google/gemini-2.0-flash-lite-001";

async function callOpenRouter(
  model: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://noteverse-red.vercel.app",
      "X-Title": "NoteVerse",
    },
    body: JSON.stringify({ model, messages, max_tokens: 4096 }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `OpenRouter error: ${res.status}`);
  }

  return data.choices?.[0]?.message?.content || "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt }: { prompt: string } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "No prompt provided" },
        { status: 400 }
      );
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    const messages = [{ role: "user", content: prompt }];

    let response: string;
    try {
      response = await callOpenRouter(PRIMARY_MODEL, messages);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes("429") ||
        message.includes("rate") ||
        message.includes("quota")
      ) {
        response = await callOpenRouter(FALLBACK_MODEL, messages);
      } else {
        throw err;
      }
    }

    return NextResponse.json({ response });
  } catch (err: unknown) {
    console.error("AI Generate API error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
