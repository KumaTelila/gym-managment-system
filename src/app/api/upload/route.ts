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

    // Detect serverless environments (Vercel, AWS Lambda, Netlify) where /var/task is read-only (EROFS)
    const isServerless = Boolean(
      process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NETLIFY
    );

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
          { error: "Invalid file type. Only images (PNG, JPG, WEBP, SVG, GIF) are allowed." },
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

      // Determine extension and proper MIME
      let ext = "png";
      let mimeType = file.type || "image/png";
      if (file.type.includes("jpeg") || file.type.includes("jpg")) {
        ext = "jpg";
        mimeType = "image/jpeg";
      } else if (file.type.includes("webp")) {
        ext = "webp";
        mimeType = "image/webp";
      } else if (file.type.includes("svg")) {
        ext = "svg";
        mimeType = "image/svg+xml";
      } else if (file.type.includes("gif")) {
        ext = "gif";
        mimeType = "image/gif";
      } else if (file.name.includes(".")) {
        ext = file.name.split(".").pop() || "png";
      }

      // If running on Vercel / serverless: return a Base64 Data URL.
      // Serverless filesystems are strictly read-only (/var/task) and ephemeral.
      // Data URLs persist directly in the Neon/Postgres database with 0 external S3 config required!
      if (isServerless) {
        const base64Url = `data:${mimeType};base64,${buffer.toString("base64")}`;
        return NextResponse.json({ success: true, url: base64Url });
      }

      // Local development: attempt to persist to public/uploads, fallback to Data URL on any EROFS error
      try {
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filename = `img-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const filepath = path.join(uploadsDir, filename);

        fs.writeFileSync(filepath, buffer);
        const fileUrl = `/uploads/${filename}`;
        return NextResponse.json({ success: true, url: fileUrl });
      } catch (fsErr: unknown) {
        console.warn("Local filesystem write failed, falling back to data URL:", fsErr);
        const base64Url = `data:${mimeType};base64,${buffer.toString("base64")}`;
        return NextResponse.json({ success: true, url: base64Url });
      }
    }

    // 2. Handle JSON base64 data upload
    const body = await request.json();
    const { base64, filename: customName } = body;

    if (!base64 || typeof base64 !== "string") {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 });
    }

    // If it's already a full data URL and we're on serverless, return it directly
    if (isServerless && base64.startsWith("data:image/")) {
      return NextResponse.json({ success: true, url: base64 });
    }

    // Extract mime and base64 payload
    const matches = base64.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: "Invalid base64 image data" }, { status: 400 });
    }

    const mimeSubtype = matches[1];
    const mimeType = `image/${mimeSubtype}`;
    const ext = mimeSubtype === "jpeg" ? "jpg" : mimeSubtype;
    const buffer = Buffer.from(matches[2], "base64");

    if (isServerless) {
      return NextResponse.json({ success: true, url: base64 });
    }

    // Local filesystem write
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filename = `${customName ? customName.replace(/[^a-zA-Z0-9_-]/g, "") + "-" : "img-"}${Date.now()}.${ext}`;
      const filepath = path.join(uploadsDir, filename);

      fs.writeFileSync(filepath, buffer);

      const fileUrl = `/uploads/${filename}`;
      return NextResponse.json({ success: true, url: fileUrl });
    } catch (fsErr: unknown) {
      console.warn("Local filesystem write failed, falling back to data URL:", fsErr);
      return NextResponse.json({ success: true, url: base64 });
    }
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload file" },
      { status: 500 }
    );
  }
}
