import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Copy, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { GenerateEmbeddingResponse } from "@shared/schema";

interface ModelRow {
  id: string;
  model: string;
  embedding: number[] | null;
  loading: boolean;
  tokenCount: number;
  processingTime: number;
  dimensions: number;
}

interface ModelComparisonTableProps {
  inputText: string;
}

const MODELS = [
  { value: "text-embedding-3-small", label: "text-embedding-3-small (1536 dim, $0.02/1M tokens)" },
  { value: "text-embedding-3-large", label: "text-embedding-3-large (3072 dim, $0.13/1M tokens)" },
  { value: "text-embedding-ada-002", label: "text-embedding-ada-002 (1536 dim, $0.10/1M tokens)" },
];

export default function ModelComparisonTable({ inputText }: ModelComparisonTableProps) {
  const [rows, setRows] = useState<ModelRow[]>([
    { id: "1", model: "", embedding: null, loading: false, tokenCount: 0, processingTime: 0, dimensions: 0 },
    { id: "2", model: "", embedding: null, loading: false, tokenCount: 0, processingTime: 0, dimensions: 0 },
    { id: "3", model: "", embedding: null, loading: false, tokenCount: 0, processingTime: 0, dimensions: 0 },
  ]);
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  const generateEmbeddingMutation = useMutation({
    mutationFn: async ({ text, model }: { text: string; model: string }) => {
      const response = await apiRequest("POST", "/api/embeddings/generate", { text, model });
      return response.json() as Promise<GenerateEmbeddingResponse>;
    },
    onSuccess: (data, variables) => {
      setRows(prev => prev.map(row => 
        row.id === variables.rowId ? {
          ...row,
          embedding: data.embedding,
          loading: false,
          tokenCount: data.tokenCount,
          processingTime: data.processingTime,
          dimensions: data.dimensions,
        } : row
      ));
    },
    onError: (error: any, variables) => {
      setRows(prev => prev.map(row => 
        row.id === variables.rowId ? { ...row, loading: false } : row
      ));
      toast({
        title: "Error",
        description: error.message || "Failed to generate embedding",
        variant: "destructive",
      });
    },
  });

  const handleModelChange = (rowId: string, model: string) => {
    setRows(prev => prev.map(row => 
      row.id === rowId ? { ...row, model, embedding: null } : row
    ));

    if (model && inputText.trim()) {
      setRows(prev => prev.map(row => 
        row.id === rowId ? { ...row, loading: true } : row
      ));
      
      generateEmbeddingMutation.mutate({ 
        text: inputText, 
        model, 
        rowId 
      } as any);
    }
  };

  const handleCopyEmbedding = async (rowId: string, embedding: number[]) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(embedding));
      setCopiedStates(prev => ({ ...prev, [rowId]: true }));
      toast({
        title: "Copied",
        description: "Embedding copied to clipboard",
      });
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [rowId]: false }));
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const addRow = () => {
    const newId = (rows.length + 1).toString();
    setRows(prev => [...prev, {
      id: newId,
      model: "",
      embedding: null,
      loading: false,
      tokenCount: 0,
      processingTime: 0,
      dimensions: 0,
    }]);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
      <div className="px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800">Model Comparison</h2>
        <p className="text-sm text-slate-600 mt-1">Compare embeddings across different OpenAI models</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-700 w-1/4">Model</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Embedding Result</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-slate-700 w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <Select value={row.model} onValueChange={(value) => handleModelChange(row.id, value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-2">
                    {row.loading && (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span className="text-sm text-slate-600">Generating embedding...</span>
                      </div>
                    )}
                    
                    {row.embedding && !row.loading && (
                      <>
                        <div className="bg-slate-100 rounded-lg p-3 font-mono text-xs text-slate-700 max-h-24 overflow-y-auto">
                          <div className="text-slate-500 mb-1">{row.dimensions}-dimensional vector:</div>
                          [{row.embedding.slice(0, 5).map(n => n.toFixed(4)).join(', ')}, ...]
                        </div>
                        
                        <div className="text-xs text-slate-500">
                          Dimensions: <span>{row.dimensions}</span> | 
                          Processing time: <span>{row.processingTime}ms</span>
                        </div>
                      </>
                    )}

                    {!row.embedding && !row.loading && row.model && (
                      <div className="text-sm text-slate-500">
                        Enter text to generate embedding
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!row.embedding}
                    onClick={() => row.embedding && handleCopyEmbedding(row.id, row.embedding)}
                    className={copiedStates[row.id] ? "text-success border-success" : ""}
                  >
                    {copiedStates[row.id] ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </td>
              </tr>
            ))}
            
            <tr>
              <td colSpan={3} className="px-6 py-4">
                <Button
                  variant="outline"
                  onClick={addRow}
                  className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-primary hover:text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Model Comparison
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
