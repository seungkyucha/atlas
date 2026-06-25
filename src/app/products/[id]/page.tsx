import { notFound } from "next/navigation";
import { getProduct } from "@/lib/store";
import { ProductSettings } from "@/components/ProductSettings";

export const dynamic = "force-dynamic";

export default function ProductSettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const product = getProduct(params.id);
  if (!product) notFound();
  return <ProductSettings product={product} />;
}
