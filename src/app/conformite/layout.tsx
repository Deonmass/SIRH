import { ConformiteSubNav } from "@/components/conformite/ConformiteSubNav";
import { PageHeader } from "@/components/layout/PageHeader";

export default function ConformiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <PageHeader
        title="Conformité documentaire & sociale"
        description="Checklists RH — CNSS, ONEM, INPP — Guide RDC 2026"
      />
      <ConformiteSubNav />
      {children}
    </div>
  );
}
