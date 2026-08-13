import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, mainFile, files } = body;
    const textToCompile = content || (files && mainFile ? files[mainFile] : "") || "";

    if (!textToCompile) {
      return NextResponse.json({ success: false, error: "No LaTeX content provided" }, { status: 400 });
    }

    // Call online TeX compilation service on server-side (bypasses browser CORS)
    const compileUrl = `https://latexonline.cc/compile?text=${encodeURIComponent(textToCompile)}`;
    
    const response = await fetch(compileUrl, {
      method: "GET",
      headers: {
        Accept: "application/pdf",
      },
    });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const base64Pdf = Buffer.from(arrayBuffer).toString("base64");
      return NextResponse.json({
        success: true,
        pdfBase64: base64Pdf,
        log: "Compiled successfully via TeX Server Engine",
      });
    } else {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: errorText || `LaTeX Compilation error (HTTP status ${response.status})`,
        },
        { status: 400 }
      );
    }
  } catch (err: any) {
    console.error("Compile API Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to reach LaTeX compilation server",
      },
      { status: 500 }
    );
  }
}
