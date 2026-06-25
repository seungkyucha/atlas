import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getProducts, getProduct, productSpeakers } from "@/lib/repo";
import { SpeakersEditor } from "@/components/SpeakersEditor";

export const dynamic = "force-dynamic";

export default async function SpeakersPage({
  searchParams,
}: {
  searchParams: { product?: string };
}) {
  const products = await getProducts();
  const productId = searchParams.product ?? products[0]?.id;
  const product = productId ? await getProduct(productId) : null;
  if (!product) return null;
  const speakers = await productSpeakers(product.id);

  return (
    <>
      <PageHeader
        crumb="자산 관리"
        title="화자 · 어투"
        subtitle="캐릭터별 말투를 언어별로 정의 — AI 번역 시 자동 반영"
        right={
          <div className="flex gap-1.5">
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/speakers?product=${p.id}`}
                className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold ${
                  p.id === product.id ? "bg-indigo-soft text-indigo-deep" : "text-muted hover:bg-line2"
                }`}
              >
                {p.name}
              </Link>
            ))}
          </div>
        }
      />
      <main className="px-8 py-6">
        <SpeakersEditor productId={product.id} speakers={speakers} targetLangs={product.targetLangs} />
      </main>
    </>
  );
}
