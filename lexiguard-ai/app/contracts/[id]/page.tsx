import { Suspense } from "react";
import { Workspace } from "@/components/analysis/Workspace";

export default function ContractPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={null}>
      <Workspace id={params.id} />
    </Suspense>
  );
}
