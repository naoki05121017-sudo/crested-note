import { notFound, redirect } from "next/navigation";
import { getAnimalByCrestLinkId } from "@/lib/db/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Crest Link" };

export default async function CrestLinkPublicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const animal = await getAnimalByCrestLinkId(decodeURIComponent(id));
  if (!animal) notFound();
  redirect(`/animals/${animal.id}`);
}
