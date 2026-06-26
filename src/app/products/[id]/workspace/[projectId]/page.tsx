import { notFound } from "next/navigation";
import {
  getProjectWithSegments,
  getProduct,
  productSpeakers,
  productGlossary,
  productContexts,
} from "@/lib/repo";
import { StringGrid } from "@/components/StringGrid";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({
  params,
}: {
  params: { id: string; projectId: string };
}) {
  const project = await getProjectWithSegments(params.projectId);
  if (!project || project.productId !== params.id) notFound();
  const product = await getProduct(project.productId);
  if (!product) notFound();

  const [speakers, glossary, contexts] = await Promise.all([
    productSpeakers(product.id),
    productGlossary(product.id),
    productContexts(product.id),
  ]);

  return (
    <StringGrid
      project={project}
      product={product}
      speakers={speakers}
      glossary={glossary}
      contexts={contexts}
    />
  );
}
