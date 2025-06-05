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
  { value: "text-embedding-3-large", label: "text-embedding-3-large (1536 dim, $0.13/1M tokens)" },
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
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-700 w-1/5">Model</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Embedding Result 1</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Embedding Result 2</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-slate-700 w-32">Actions</th>
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
                
                {/* Embedding Result 1 */}
                <td className="px-6 py-4">
                  <div className="space-y-2">
                    {row.loading1 && (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span className="text-sm text-slate-600">Generating...</span>
                      </div>
                    )}
                    
                    {row.embedding1 && !row.loading1 && (
                      <>
                        <textarea
                          className="w-full bg-slate-100 rounded-lg p-3 font-mono text-xs text-slate-700 resize-none border-0 focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                          value={JSON.stringify(row.embedding1, null, 2)}
                          readOnly
                          rows={3}
                          onFocus={(e) => {
                            e.target.rows = 8;
                            e.target.select();
                          }}
                          onBlur={(e) => {
                            e.target.rows = 3;
                          }}
                        />
                        
                        <div className="text-xs text-slate-500">
                          {(() => {
                            const chunks = inputText1.split('\n').filter(chunk => chunk.trim().length > 0);
                            const chunkCount = chunks.length;
                            return chunkCount > 1 
                              ? `${chunkCount}×${row.dimensions1}D | ${row.processingTime1}ms`
                              : `${row.dimensions1}D | ${row.processingTime1}ms`;
                          })()}
                        </div>
                      </>
                    )}

                    {!row.embedding1 && !row.loading1 && row.model && (
                      <div className="text-sm text-slate-500">
                        {inputText1.trim() ? "Ready to generate" : "Enter text 1"}
                      </div>
                    )}
                  </div>
                </td>

                {/* Embedding Result 2 */}
                <td className="px-6 py-4">
                  <div className="space-y-2">
                    {row.loading2 && (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span className="text-sm text-slate-600">Generating...</span>
                      </div>
                    )}
                    
                    {row.embedding2 && !row.loading2 && (
                      <>
                        <textarea
                          className="w-full bg-slate-100 rounded-lg p-3 font-mono text-xs text-slate-700 resize-none border-0 focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                          value={JSON.stringify(row.embedding2, null, 2)}
                          readOnly
                          rows={3}
                          onFocus={(e) => {
                            e.target.rows = 8;
                            e.target.select();
                          }}
                          onBlur={(e) => {
                            e.target.rows = 3;
                          }}
                        />
                        
                        <div className="text-xs text-slate-500">
                          {(() => {
                            const chunks = inputText2.split('\n').filter(chunk => chunk.trim().length > 0);
                            const chunkCount = chunks.length;
                            return chunkCount > 1 
                              ? `${chunkCount}×${row.dimensions2}D | ${row.processingTime2}ms`
                              : `${row.dimensions2}D | ${row.processingTime2}ms`;
                          })()}
                        </div>
                      </>
                    )}

                    {!row.embedding2 && !row.loading2 && row.model && (
                      <div className="text-sm text-slate-500">
                        {inputText2.trim() ? "Ready to generate" : "Enter text 2"}
                      </div>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 text-right">
                  <div className="flex flex-col space-y-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!row.embedding1}
                      onClick={() => row.embedding1 && handleCopyEmbedding(`${row.id}-1`, row.embedding1)}
                      className={copiedStates[`${row.id}-1`] ? "text-success border-success text-xs" : "text-xs"}
                    >
                      {copiedStates[`${row.id}-1`] ? (
                        <>
                          <Check className="mr-1 h-3 w-3" />
                          Copied 1
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 h-3 w-3" />
                          Copy 1
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!row.embedding2}
                      onClick={() => row.embedding2 && handleCopyEmbedding(`${row.id}-2`, row.embedding2)}
                      className={copiedStates[`${row.id}-2`] ? "text-success border-success text-xs" : "text-xs"}
                    >
                      {copiedStates[`${row.id}-2`] ? (
                        <>
                          <Check className="mr-1 h-3 w-3" />
                          Copied 2
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 h-3 w-3" />
                          Copy 2
                        </>
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            
            <tr>
              <td colSpan={4} className="px-6 py-4">
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
