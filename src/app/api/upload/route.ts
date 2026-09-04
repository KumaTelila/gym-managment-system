import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 1. Handle multipart/form-data upload
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      // Validate MIME type
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "Invalid file type. Only images (PNG, JPG, WEBP, SVG) are allowed." },
          { status: 400 }
        );
      }

      // Max size: 5MB
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File size exceeds maximum limit of 5MB." },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Determine extension
      let ext = "png";
      if (file.type.includes("jpeg") || file.type.includes("jpg")) ext = "jpg";
      else if (file.type.includes("webp")) ext = "webp";
      else if (file.type.includes("svg")) ext = "svg";
      else if (file.type.includes("gif")) ext = "gif";
      else if (file.name.includes(".")) {
        ext = file.name.split(".").pop() || "png";
      }

      const filename = `img-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filepath = path.join(uploadsDir, filename);

      fs.writeFileSync(filepath, buffer);

      const fileUrl = `/uploads/${filename}`;
      return NextResponse.json({ success: true, url: fileUrl });
    }

    // 2. Handle JSON base64 data upload
    const body = await request.json();
    const { base64, filename: customName } = body;

    if (!base64 || typeof base64 !== "string") {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 });
    }

    // Extract mime and base64 payload
    const matches = base64.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: "Invalid base64 image data" }, { status: 400 });
    }

    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    const buffer = Buffer.from(matches[2], "base64");

    const filename = `${customName ? customName.replace(/[^a-zA-Z0-9_-]/g, "") + "-" : "img-"}${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);

    fs.writeFileSync(filepath, buffer);

    const fileUrl = `/uploads/${filename}`;
    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload file" },
      { status: 500 }
    );
  }
}
