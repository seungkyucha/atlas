import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { db, getProduct, productContexts } from "@/lib/store";
import { ContextEditor } from "@/components/ContextEditor";

export const dynamic = "force-dynamic";

export default function ContextPage({
  searchParams,
}: {
  searchParams: { product?: string };
}) {
  const productId = searchParams.product ?? db.products[0]?.id;
  const product = getProduct(productId);
  if (!product) return null;

  return (
    <>
      <PageHeader
        crumb="자산 관리"
        title="내러티브 맥락"
        subtitle="씬/아크별 맥락 노트와 언어별 번역 가이드"
        right={
          <div className="flex gap-1.5">
            {db.products.map((p) => (
              <Link
                key={p.id}
                href={`/context?product=${p.id}`}
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
        <ContextEditor contexts={productContexts(product.id)} targetLangs={product.targetLangs} />
      </main>
    </>
  );
}
