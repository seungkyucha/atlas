import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { currentUser, atLeast } from "@/lib/session";
import { MembersTable } from "@/components/MembersTable";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const members = await prisma.appUser.findMany({ orderBy: { createdAt: "asc" } });
  const me = await currentUser();
  const canEdit = atLeast(me?.role, "admin");

  return (
    <>
      <PageHeader
        crumb="조직"
        title="멤버 · 권한"
        subtitle="법인/스튜디오/프로덕트 접근을 역할로 제어 (RBAC)"
      />
      <main className="px-8 py-6">
        {!canEdit && (
          <div className="mb-4 rounded-lg bg-warn-soft px-3 py-2 text-[12.5px] text-warn">
            역할 변경은 관리자(admin) 이상만 가능합니다. (내 역할: {me?.role ?? "—"})
          </div>
        )}
        <MembersTable
          members={members.map((m) => ({
            id: m.id,
            email: m.email,
            name: m.name,
            role: m.role,
            lastLogin: m.lastLogin.toISOString(),
          }))}
          canEdit={canEdit}
          meId={me?.id}
        />
      </main>
    </>
  );
}
