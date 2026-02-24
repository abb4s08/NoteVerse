import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

/**
 * Delete a blob by URL.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { url } = (await request.json()) as { url: string };
    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }
    await del(url);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Blob delete error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
