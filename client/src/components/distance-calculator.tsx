import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { parseEmbedding } from "@/lib/embedding-utils";
import type { CalculateDistanceResponse } from "@shared/schema";

export default function DistanceCalculator() {
  const [embeddingA, setEmbeddingA] = useState("");
  const [embeddingB, setEmbeddingB] = useState("");
  const [metric, setMetric] = useState("cosine");
  const [result, setResult] = useState<CalculateDistanceResponse | null>(null);
  const [embeddingAInfo, setEmbeddingAInfo] = useState("");
  const [embeddingBInfo, setEmbeddingBInfo] = useState("");
  const { toast } = useToast();

  const calculateDistanceMutation = useMutation({
    mutationFn: async ({ embeddingA, embeddingB, metric }: { 
      embeddingA: number[]; 
      embeddingB: number[]; 
      metric: string; 
    }) => {
      const response = await apiRequest("POST", "/api/embeddings/distance", { 
        embeddingA, 
        embeddingB, 
        metric 
      });
      return response.json() as Promise<CalculateDistanceResponse>;
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to calculate distance",
        variant: "destructive",
      });
    },
  });

  const handleEmbeddingAChange = (value: string) => {
    setEmbeddingA(value);
    try {
      if (value.trim()) {
        const parsed = parseEmbedding(value);
        setEmbeddingAInfo(`${parsed.length} dimensions detected`);
      } else {
        setEmbeddingAInfo("");
      }
    } catch (error) {
      setEmbeddingAInfo("Invalid format");
    }
  };

  const handleEmbeddingBChange = (value: string) => {
    setEmbeddingB(value);
    try {
      if (value.trim()) {
        const parsed = parseEmbedding(value);
        setEmbeddingBInfo(`${parsed.length} dimensions detected`);
      } else {
        setEmbeddingBInfo("");
      }
    } catch (error) {
      setEmbeddingBInfo("Invalid format");
    }
  };

  const handleCalculate = () => {
    try {
      const vectorA = parseEmbedding(embeddingA);
      const vectorB = parseEmbedding(embeddingB);
      
      if (vectorA.length !== vectorB.length) {
        toast({
          title: "Error",
          description: `Embedding dimensions must match. A: ${vectorA.length}, B: ${vectorB.length}`,
          variant: "destructive",
        });
        return;
      }

      calculateDistanceMutation.mutate({ 
        embeddingA: vectorA, 
        embeddingB: vectorB, 
        metric 
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Invalid embedding format",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Distance Calculator</h2>
            <p className="text-sm text-slate-600 mt-1">Calculate similarity between embeddings</p>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-slate-600">Distance Metric:</label>
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cosine">Cosine Distance</SelectItem>
                <SelectItem value="euclidean" disabled>
                  Euclidean (Coming Soon)
                </SelectItem>
                <SelectItem value="manhattan" disabled>
                  Manhattan (Coming Soon)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Embedding A */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Embedding A
            </label>
            <Textarea 
              placeholder="Paste first embedding vector here..."
              className="h-32 font-mono text-sm resize-none"
              value={embeddingA}
              onChange={(e) => handleEmbeddingAChange(e.target.value)}
            />
            <div className="mt-2 text-xs text-slate-500">
              {embeddingAInfo || "Enter a valid JSON array"}
            </div>
          </div>

          {/* Embedding B */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Embedding B
            </label>
            <Textarea 
              placeholder="Paste second embedding vector here..."
              className="h-32 font-mono text-sm resize-none"
              value={embeddingB}
              onChange={(e) => handleEmbeddingBChange(e.target.value)}
            />
            <div className="mt-2 text-xs text-slate-500">
              {embeddingBInfo || "Enter a valid JSON array"}
            </div>
          </div>
        </div>

        {/* Calculate Button and Results */}
        <div className="flex flex-col items-center space-y-4">
          <Button 
            onClick={handleCalculate}
            disabled={!embeddingA.trim() || !embeddingB.trim() || calculateDistanceMutation.isPending}
            className="px-6 py-3"
          >
            <Calculator className="mr-2 h-4 w-4" />
            {calculateDistanceMutation.isPending ? "Calculating..." : "Calculate Distance"}
          </Button>

          {/* Results */}
          {result && (
            <div className="w-full max-w-md">
              <div className="bg-slate-100 rounded-lg p-4 text-center">
                <div className="text-sm text-slate-600 mb-2">Cosine Distance</div>
                <div className="text-2xl font-bold text-slate-800">
                  {result.distance.toFixed(4)}
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  Similarity Score: {result.similarity.toFixed(2)}%
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
                  <div>Processing Time: {result.processingTime}ms</div>
                  <div>Vector Dimensions: {result.vectorDimensions}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
