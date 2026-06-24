import { notFound } from "next/navigation";
import { getProject } from "@/lib/data";
import { Workspace } from "@/components/Workspace";

export default function WorkspacePage({
  params,
}: {
  params: { projectId: string };
}) {
  const project = getProject(params.projectId);
  if (!project) notFound();
  return <Workspace project={project} />;
}
