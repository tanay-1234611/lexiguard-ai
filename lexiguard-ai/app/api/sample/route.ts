import { SAMPLE_PAGES } from "@/lib/demo";

/** Downloads the fictional sample contract as text (print it to PDF to test real uploads). */
export async function GET() {
  const text = SAMPLE_PAGES.map((p, i) => `${p}\n\n--- Page ${i + 1} of ${SAMPLE_PAGES.length} ---`).join("\n\n\n");
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="fictional-sample-employment-agreement.txt"',
    },
  });
}
