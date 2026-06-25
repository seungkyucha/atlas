import { notFound } from "next/navigation";
import {
  getProjectWithSegments,
  getProduct,
  productSpeakers,
  productGlossary,
  productContexts,
} from "@/lib/repo";
import { Workspace } from "@/components/Workspace";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({
  params,
}: {
  params: { projectId: string };
}) {
  const project = await getProjectWithSegments(params.projectId);
  if (!project) notFound();
  const product = await getProduct(project.productId);
  if (!product) notFound();

  const [speakers, glossary, contexts] = await Promise.all([
    productSpeakers(product.id),
    productGlossary(product.id),
    productContexts(product.id),
  ]);

  return (
    <Workspace
      project={project}
      product={product}
      speakers={speakers}
      glossary={glossary}
      contexts={contexts}
    />
  );
}
