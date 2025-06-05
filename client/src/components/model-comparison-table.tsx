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
  embedding1: number[] | null;
  embedding2: number[] | null;
  loading1: boolean;
  loading2: boolean;
  tokenCount1: number;
  tokenCount2: number;
  processingTime1: number;
  processingTime2: number;
  dimensions1: number;
  dimensions2: number;
}

interface ModelComparisonTableProps {
  inputText1: string;
  inputText2: string;
}

const MODELS = [
  { value: "text-embedding-3-small", label: "text-embedding-3-small (1536 dim, $0.02/1M tokens)" },
  { value: "text-embedding-3-large", label: "text-embedding-3-large (3072 dim, $0.13/1M tokens)" },
  { value: "text-embedding-ada-002", label: "text-embedding-ada-002 (1536 dim, $0.10/1M tokens)" },
];

export default function ModelComparisonTable({ inputText1, inputText2 }: ModelComparisonTableProps) {
  const [rows, setRows] = useState<ModelRow[]>([
    { id: "1", model: "", embedding1: null, embedding2: null, loading1: false, loading2: false, tokenCount1: 0, tokenCount2: 0, processingTime1: 0, processingTime2: 0, dimensions1: 0, dimensions2: 0 },
    { id: "2", model: "", embedding1: null, embedding2: null, loading1: false, loading2: false, tokenCount1: 0, tokenCount2: 0, processingTime1: 0, processingTime2: 0, dimensions1: 0, dimensions2: 0 },
    { id: "3", model: "", embedding1: null, embedding2: null, loading1: false, loading2: false, tokenCount1: 0, tokenCount2: 0, processingTime1: 0, processingTime2: 0, dimensions1: 0, dimensions2: 0 },
  ]);
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  const generateEmbeddingMutation = useMutation({
    mutationFn: async ({ text, model, inputNumber }: { text: string; model: string; inputNumber: 1 | 2 }) => {
      const response = await apiRequest("POST", "/api/embeddings/generate", { text, model });
      return response.json() as Promise<GenerateEmbeddingResponse>;
    },
    onSuccess: (data, variables: any) => {
      setRows(prev => prev.map(row => 
        row.id === variables.rowId ? {
          ...row,
          [`embedding${variables.inputNumber}`]: data.embedding,
          [`loading${variables.inputNumber}`]: false,
          [`tokenCount${variables.inputNumber}`]: data.tokenCount,
          [`processingTime${variables.inputNumber}`]: data.processingTime,
          [`dimensions${variables.inputNumber}`]: data.dimensions,
        } : row
      ));
    },
    onError: (error: any, variables: any) => {
      setRows(prev => prev.map(row => 
        row.id === variables.rowId ? { 
          ...row, 
          [`loading${variables.inputNumber}`]: false 
        } : row
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
      row.id === rowId ? { ...row, model, embedding1: null, embedding2: null } : row
    ));

    // Generate embeddings for both inputs if model is selected
    if (model) {
      if (inputText1.trim()) {
        setRows(prev => prev.map(row => 
          row.id === rowId ? { ...row, loading1: true } : row
        ));
        
        generateEmbeddingMutation.mutate({ 
          text: inputText1, 
          model, 
          inputNumber: 1,
          rowId 
        } as any);
      }

      if (inputText2.trim()) {
        setRows(prev => prev.map(row => 
          row.id === rowId ? { ...row, loading2: true } : row
        ));
        
        generateEmbeddingMutation.mutate({ 
          text: inputText2, 
          model, 
          inputNumber: 2,
          rowId 
        } as any);
      }
    }
  };

  const handleCopyEmbedding = async (embeddingKey: string, embedding: number[]) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(embedding));
      setCopiedStates(prev => ({ ...prev, [embeddingKey]: true }));
      toast({
        title: "Copied",
        description: "Embedding copied to clipboard",
      });
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [embeddingKey]: false }));
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
      embedding1: null,
      embedding2: null,
      loading1: false,
      loading2: false,
      tokenCount1: 0,
      tokenCount2: 0,
      processingTime1: 0,
      processingTime2: 0,
      dimensions1: 0,
      dimensions2: 0,
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
