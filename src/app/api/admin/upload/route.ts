import { NextResponse } from "next/server";
import { assertRole } from "@/lib/supabase";

export async function POST(request: Request) {
  const { client, ok, configured } = await assertRole(request, ["admin"]);
  if (!configured) return NextResponse.json({ error: "Supabase Storage is not configured." }, { status: 503 });
  if (!ok || !client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file." }, { status: 400 });
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "Only JPG, PNG and WebP images are allowed." }, { status: 415 });
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Image must be between 1 byte and 5 MB." }, { status: 413 });
  const folderValue = formData.get("folder");
  const folder = folderValue === "categories" ? "categories" : "products";

  const bytes = Buffer.from(await file.arrayBuffer());

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${folder}/${Date.now()}-${safeName}`;
  const { error } = await client.storage.from("product-images").upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = client.storage.from("product-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path, source: "supabase" });
}
