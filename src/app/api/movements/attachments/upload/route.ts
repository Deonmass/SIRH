import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function isAllowedFile(file: File): boolean {
  if (ALLOWED.includes(file.type)) return true;
  return /\.(pdf|jpe?g|png|webp|docx?)$/i.test(file.name);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const entries = formData.getAll("files");
  const files = entries.filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (!files.length) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "mouvements");
  await fs.mkdir(uploadDir, { recursive: true });

  const paths: string[] = [];

  for (const file of files) {
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop volumineux : ${file.name} (max 10 Mo)` },
        { status: 400 }
      );
    }
    if (!isAllowedFile(file)) {
      return NextResponse.json(
        { error: `Type de fichier non autorisé : ${file.name}` },
        { status: 400 }
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storedName = `mvt-${Date.now()}-${safeName}`;
    const filePath = path.join(uploadDir, storedName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    paths.push(`/uploads/mouvements/${storedName}`);
  }

  return NextResponse.json({ paths });
}
