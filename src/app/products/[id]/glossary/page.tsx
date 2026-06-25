import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getProduct, productGlossary } from "@/lib/repo";
import { GlossaryTable } from "@/components/GlossaryTable";

export const dynamic = "force-dynamic";

export default async function GlossaryPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  if (!product) notFound();
  const terms = await productGlossary(product.id);

  return (
    <>
      <PageHeader
        crumb={`${product.name} · 자산`}
        title="용어집"
        subtitle="언어별 표준 번역어 · DNT · AI 채우기"
      />
      <main className="px-8 py-6">
        <GlossaryTable productId={product.id} targetLangs={product.targetLangs} initial={terms} />
      </main>
    </>
  );
}
