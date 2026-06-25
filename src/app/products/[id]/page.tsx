import { notFound } from "next/navigation";
import { getProduct, productProjects } from "@/lib/repo";
import { ProductSettings } from "@/components/ProductSettings";

export const dynamic = "force-dynamic";

export default async function ProductSettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProduct(params.id);
  if (!product) notFound();
  const projects = await productProjects(product.id);
  return (
    <ProductSettings
      product={product}
      projects={projects.map((p) => ({ id: p.id, name: p.name, segments: p.segments.length }))}
    />
  );
}
