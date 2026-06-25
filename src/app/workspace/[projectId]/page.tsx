import { notFound } from "next/navigation";
import {
  getProject,
  getProduct,
  productSpeakers,
  productGlossary,
  productContexts,
} from "@/lib/store";
import { Workspace } from "@/components/Workspace";

export const dynamic = "force-dynamic";

export default function WorkspacePage({
  params,
}: {
  params: { projectId: string };
}) {
  const project = getProject(params.projectId);
  if (!project) notFound();
  const product = getProduct(project.productId);
  if (!product) notFound();

  return (
    <Workspace
      project={project}
      product={product}
      speakers={productSpeakers(product.id)}
      glossary={productGlossary(product.id)}
      contexts={productContexts(product.id)}
    />
  );
}
