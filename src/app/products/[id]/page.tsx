import { notFound } from "next/navigation";
import { getProduct } from "@/lib/repo";
import { ProductSettings } from "@/components/ProductSettings";

export const dynamic = "force-dynamic";

export default async function ProductSettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProduct(params.id);
  if (!product) notFound();
  return <ProductSettings product={product} />;
}
