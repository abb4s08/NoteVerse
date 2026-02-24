import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * Server handler required by @vercel/blob client uploads.
 * The client SDK calls this endpoint to get a secure upload token,
 * then uploads the file directly to Vercel Blob from the browser.
 *
 * Allowed: .pdf, .png, .jpg, .jpeg — max 25 MB
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Validate before issuing an upload token
        return {
          allowedContentTypes: [
            "application/pdf",
            "image/png",
            "image/jpeg",
          ],
          maximumSizeInBytes: 25 * 1024 * 1024, // 25 MB
          tokenPayload: JSON.stringify({}),
        };
      },
      onUploadCompleted: async () => {
        // No-op — Firestore write happens client-side after upload
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
