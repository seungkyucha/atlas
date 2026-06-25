import { PageHeader } from "@/components/PageHeader";
import { getProducts } from "@/lib/repo";
import { ImportPanel } from "@/components/ImportPanel";
import { langLabel } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const products = await getProducts();
  return (
    <>
      <PageHeader
        crumb="자산 관리"
        title="문서 가져오기 · AI 자동 분석"
        subtitle="기존 번역 문서(CSV/XLSX)를 업로드해 세그먼트로 적재하고, 화자·용어를 AI로 자동 분류"
      />
      <main className="max-w-3xl px-8 py-6">
        <ImportPanel
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            sourceLang: langLabel(p.sourceLang),
            targetLangs: p.targetLangs.map(langLabel),
          }))}
        />
      </main>
    </>
  );
}
