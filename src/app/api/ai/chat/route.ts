import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Multimodal model for image understanding + text
const PRIMARY_MODEL = "google/gemini-2.0-flash-001";
const FALLBACK_MODEL = "google/gemini-2.0-flash-lite-001";

const SYSTEM_PROMPT = `You are NoteVerse AI, an expert educational tutor built into a collaborative classroom platform.

Your capabilities:
- Explain core concepts clearly with step-by-step breakdowns
- Analyze uploaded images (whiteboards, diagrams, code screenshots, data structures, math problems)
- Process and discuss uploaded PDF documents
- Generate structured summaries with bullet points
- Help students prepare for exams with study strategies
- Provide examples, analogies, and visual explanations

When a user uploads an image:
- Identify what the image contains (diagram, code, handwriting, chart, etc.)
- Break down the content systematically
- Explain algorithms, syntax, or concepts shown step-by-step
- Point out any errors or improvements if applicable

When a user uploads a PDF:
- Summarize key sections clearly
- Answer specific questions about the document content
- Highlight important terms, definitions, and takeaways

Always use markdown formatting for readability: headings, bullet points, code blocks, bold/italic emphasis.
Be friendly, encouraging, and concise. Tailor explanations to a student audience.`;

interface ChatMessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ChatMessageContent[];
}

async function callOpenRouter(
  model: string,
  messages: ChatMessage[]
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
    const {
      messages,
      imageBase64,
      imageMimeType,
      pdfText,
    }: {
      messages: { role: "user" | "assistant"; content: string }[];
      imageBase64?: string;
      imageMimeType?: string;
      pdfText?: string;
    } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    // Build OpenRouter messages array
    const openRouterMessages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add conversation history (last 10 messages for context window)
    const recentMessages = messages.slice(-10);

    for (let i = 0; i < recentMessages.length; i++) {
      const msg = recentMessages[i];
      const isLast = i === recentMessages.length - 1;

      if (msg.role === "user" && isLast) {
        // For the latest user message, attach image/pdf if present
        const contentParts: ChatMessageContent[] = [];

        if (pdfText) {
          contentParts.push({
            type: "text",
            text: `[Uploaded PDF Document]\n\n${pdfText.slice(0, 15000)}`,
          });
        }

        if (imageBase64 && imageMimeType) {
          contentParts.push({
            type: "image_url",
            image_url: {
              url: `data:${imageMimeType};base64,${imageBase64}`,
            },
          });
        }

        contentParts.push({
          type: "text",
          text: msg.content,
        });

        openRouterMessages.push({
          role: "user",
          content: contentParts,
        });
      } else {
        openRouterMessages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        });
      }
    }

    // Try primary model, fall back on rate limit
    let response: string;
    try {
      response = await callOpenRouter(PRIMARY_MODEL, openRouterMessages);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes("429") ||
        message.includes("rate") ||
        message.includes("quota")
      ) {
        response = await callOpenRouter(FALLBACK_MODEL, openRouterMessages);
      } else {
        throw err;
      }
    }

    return NextResponse.json({ response });
  } catch (err: unknown) {
    console.error("AI Chat API error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
