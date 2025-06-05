import TextComparisonTable from "@/components/text-comparison-table";

export default function EmbeddingsPlayground() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Embeddings Playground
          </h1>
          <p className="text-slate-600">
            Compare query texts against stored texts using OpenAI embedding models
          </p>
        </div>

        <TextComparisonTable />
      </div>
    </div>
  );
}
