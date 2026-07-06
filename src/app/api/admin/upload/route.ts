import { NextResponse } from "next/server";
import { assertRole } from "@/lib/supabase";

export async function POST(request: Request) {
  const { client, ok } = await assertRole(request, ["admin"]);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  const folderValue = formData.get("folder");
  const folder = folderValue === "categories" ? "categories" : "products";

  const bytes = Buffer.from(await file.arrayBuffer());

  if (!client) {
    return NextResponse.json({
      url: `data:${file.type};base64,${bytes.toString("base64")}`,
      source: "inline",
    });
  }

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
