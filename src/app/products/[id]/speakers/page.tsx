import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getProduct, productSpeakers } from "@/lib/repo";
import { SpeakersEditor } from "@/components/SpeakersEditor";

export const dynamic = "force-dynamic";

export default async function SpeakersPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  if (!product) notFound();
  const speakers = await productSpeakers(product.id);

  return (
    <>
      <PageHeader
        crumb={`${product.name} · 자산`}
        title="화자 · 어투"
        subtitle="캐릭터별 말투를 언어별로 정의 — AI 번역 시 자동 반영"
      />
      <main className="px-8 py-6">
        <SpeakersEditor productId={product.id} speakers={speakers} targetLangs={product.targetLangs} />
      </main>
    </>
  );
}
