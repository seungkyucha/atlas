import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getProduct, productContexts } from "@/lib/repo";
import { ContextEditor } from "@/components/ContextEditor";

export const dynamic = "force-dynamic";

export default async function ContextPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  if (!product) notFound();
  const contexts = await productContexts(product.id);

  return (
    <>
      <PageHeader
        crumb={`${product.name} · 자산`}
        title="내러티브 맥락"
        subtitle="씬/아크별 맥락 노트와 언어별 번역 가이드"
      />
      <main className="px-8 py-6">
        <ContextEditor productId={product.id} contexts={contexts} targetLangs={product.targetLangs} />
      </main>
    </>
  );
}
