import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { db, getProduct, productGlossary } from "@/lib/store";
import { GlossaryTable } from "@/components/GlossaryTable";

export const dynamic = "force-dynamic";

export default function GlossaryPage({
  searchParams,
}: {
  searchParams: { product?: string };
}) {
  const productId = searchParams.product ?? db.products[0]?.id;
  const product = getProduct(productId);
  if (!product) return null;
  const terms = productGlossary(product.id);

  return (
    <>
      <PageHeader
        crumb="자산 관리"
        title="용어집"
        subtitle="프로덕트별 표준 번역어 · 언어별 · DNT · AI 채우기"
        right={
          <div className="flex gap-1.5">
            {db.products.map((p) => (
              <Link
                key={p.id}
                href={`/glossary?product=${p.id}`}
                className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold ${
                  p.id === product.id
                    ? "bg-indigo-soft text-indigo-deep"
                    : "text-muted hover:bg-line2"
                }`}
              >
                {p.name}
              </Link>
            ))}
          </div>
        }
      />
      <main className="px-8 py-6">
        <GlossaryTable
          productId={product.id}
          targetLangs={product.targetLangs}
          initial={terms}
        />
      </main>
    </>
  );
}
