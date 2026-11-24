import { Suspense } from "react";
import { UploadFlow } from "@/components/upload/UploadFlow";

export default function UploadPage() {
  return (
    <Suspense fallback={null}>
      <UploadFlow />
    </Suspense>
  );
}
