import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      );
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // Use pdf-parse with worker disabled for serverless compatibility
    const { PDFParse } = await import("pdf-parse");
    PDFParse.setWorker(); // disable worker — essential for serverless
    const parser = new PDFParse({ data: uint8 });
    const result = await parser.getText();

    // Clean up to release memory
    await parser.destroy();

    return NextResponse.json({ text: result.text || "" });
  } catch (err: unknown) {
    console.error("PDF parse error:", err);
    const message = err instanceof Error ? err.message : "Failed to parse PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
