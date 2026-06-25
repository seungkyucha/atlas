import { NextResponse } from "next/server";
import { runEngine } from "@/lib/engines";
import { getProduct } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// AI-fill a glossary term across target languages.
export async function POST(req: Request) {
  try {
    const { productId, source, domain, pos, targetLangs } = (await req.json()) as {
      productId: string;
      source: string;
      domain?: string;
      pos?: string;
      targetLangs?: string[];
    };
    const product = getProduct(productId);
    if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });
    if (!source) return NextResponse.json({ error: "source required" }, { status: 400 });

    const langs = (targetLangs?.length ? targetLangs : product.targetLangs).filter((l) =>
      product.targetLangs.includes(l)
    );

    const results: Record<string, { translation: string; demo: boolean }> = {};
    await Promise.all(
      langs.map(async (lang) => {
        const r = await runEngine(product.engine, product.model, {
          source,
          sourceLang: product.sourceLang,
          targetLang: lang,
          scene: pos || domain ? `glossary term (${pos ?? ""} ${domain ?? ""})`.trim() : undefined,
        });
        results[lang] = { translation: r.translation, demo: r.demo };
      })
    );
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
