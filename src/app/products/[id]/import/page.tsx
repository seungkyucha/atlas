import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getProduct } from "@/lib/repo";
import { ImportPanel } from "@/components/ImportPanel";
import { langLabel } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function ImportPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  if (!product) notFound();

  return (
    <>
      <PageHeader
        crumb={`${product.name} · 자산`}
        title="문서 가져오기 · AI 자동 분석"
        subtitle="기존 번역 문서(CSV/XLSX)를 세그먼트로 적재하고 화자·용어를 AI로 분류"
      />
      <main className="max-w-3xl px-8 py-6">
        <ImportPanel
          productId={product.id}
          productName={product.name}
          sourceLang={langLabel(product.sourceLang)}
          targetLangs={product.targetLangs.map(langLabel)}
        />
      </main>
    </>
  );
}
