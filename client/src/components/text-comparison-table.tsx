import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Play, Upload, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { GenerateEmbeddingResponse, CalculateDistanceResponse } from "@shared/schema";

interface TextRow {
  id: string;
  queryText: string;
  storedText: string;
  distances: { [model: string]: number | null };
  loading: { [model: string]: boolean };
}

const MODELS = [
  { value: "text-embedding-3-small", label: "text-embedding-3-small" },
  { value: "text-embedding-3-large", label: "text-embedding-3-large" },
  { value: "text-embedding-ada-002", label: "text-embedding-ada-002" },
];

export default function TextComparisonTable() {
  const [rows, setRows] = useState<TextRow[]>([
    { id: "1", queryText: "", storedText: "", distances: {}, loading: {} }
  ]);
  const [selectedModels, setSelectedModels] = useState<{ [key: string]: string }>({
    "model1": "",
    "model2": "",
    "model3": ""
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateEmbeddingMutation = useMutation({
    mutationFn: async ({ text, model }: { text: string; model: string }) => {
      const response = await apiRequest("POST", "/api/embeddings/generate", { text, model });
      return response.json() as Promise<GenerateEmbeddingResponse>;
    },
  });

  const calculateDistanceMutation = useMutation({
    mutationFn: async ({ embeddingA, embeddingB }: { embeddingA: number[]; embeddingB: number[]; }) => {
      const response = await apiRequest("POST", "/api/embeddings/distance", { 
        embeddingA, 
        embeddingB, 
        metric: "cosine" 
      });
      return response.json() as Promise<CalculateDistanceResponse>;
    },
  });

  const addRow = () => {
    const newId = (rows.length + 1).toString();
    setRows(prev => [...prev, {
      id: newId,
      queryText: "",
      storedText: "",
      distances: {},
      loading: {}
    }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(prev => prev.filter(row => row.id !== id));
    }
  };

  const updateRowText = (id: string, field: 'queryText' | 'storedText', value: string) => {
    setRows(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const handleModelChange = (column: string, model: string) => {
    setSelectedModels(prev => ({ ...prev, [column]: model }));
  };

  const generateComparisons = async () => {
    const activeModels = Object.values(selectedModels).filter(Boolean);
    if (activeModels.length === 0) {
      toast({
        title: "No Models Selected",
        description: "Please select at least one model to compare",
        variant: "destructive",
      });
      return;
    }

    const validRows = rows.filter(row => row.queryText.trim() && row.storedText.trim());
    if (validRows.length === 0) {
      toast({
        title: "No Valid Text Pairs",
        description: "Please enter both query and stored text for at least one row",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Set loading state for all active models
      setRows(prev => prev.map(row => ({
        ...row,
        loading: activeModels.reduce((acc, model) => ({ ...acc, [model]: true }), {})
      })));

      for (const model of activeModels) {
        // Get unique texts to minimize API calls
        const queryTextSet = new Set(validRows.map(row => row.queryText.trim()));
        const storedTextSet = new Set(validRows.map(row => row.storedText.trim()));
        const queryTexts: string[] = [];
        const storedTexts: string[] = [];
        
        queryTextSet.forEach(text => queryTexts.push(text));
        storedTextSet.forEach(text => storedTexts.push(text));

        // Generate embeddings for all unique texts
        const queryEmbeddings = new Map<string, number[]>();
        const storedEmbeddings = new Map<string, number[]>();

        // Generate query embeddings
        for (const text of queryTexts) {
          const result = await generateEmbeddingMutation.mutateAsync({ text, model });
          queryEmbeddings.set(text, result.embedding);
        }

        // Generate stored embeddings
        for (const text of storedTexts) {
          const result = await generateEmbeddingMutation.mutateAsync({ text, model });
          storedEmbeddings.set(text, result.embedding);
        }

        // Calculate distances for each row
        for (const row of validRows) {
          const queryEmbedding = queryEmbeddings.get(row.queryText.trim());
          const storedEmbedding = storedEmbeddings.get(row.storedText.trim());

          if (queryEmbedding && storedEmbedding) {
            const distanceResult = await calculateDistanceMutation.mutateAsync({
              embeddingA: queryEmbedding,
              embeddingB: storedEmbedding,
            });

            setRows(prev => prev.map(r => 
              r.id === row.id ? {
                ...r,
                distances: { ...r.distances, [model]: distanceResult.distance },
                loading: { ...r.loading, [model]: false }
              } : r
            ));
          }
        }
      }

      toast({
        title: "Comparison Complete",
        description: `Generated embeddings and calculated distances for ${activeModels.length} models across ${validRows.length} text pairs`,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate comparisons",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const parseTextChunks = (text: string): string[] => {
    return text.split('\n').filter(chunk => chunk.trim().length > 0);
  };

  const handleBulkUpload = (field: 'queryText' | 'storedText', text: string) => {
    const chunks = parseTextChunks(text);
    if (chunks.length === 0) return;

    // If we have fewer rows than chunks, add more rows
    const neededRows = Math.max(chunks.length, rows.length);
    const newRows = [...rows];
    
    for (let i = rows.length; i < neededRows; i++) {
      newRows.push({
        id: (i + 1).toString(),
        queryText: "",
        storedText: "",
        distances: {},
        loading: {}
      });
    }

    // Update the specified field for each row
    for (let i = 0; i < chunks.length; i++) {
      if (newRows[i]) {
        newRows[i][field] = chunks[i];
      }
    }

    setRows(newRows);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Text Comparison Table</h2>
            <p className="text-sm text-slate-600 mt-1">Compare query texts against stored texts across multiple models</p>
          </div>
          <Button 
            onClick={generateComparisons}
            disabled={isGenerating}
            className="px-6"
          >
            <Play className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Show Cosine Distances"}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 border-r border-slate-200" colSpan={2}>
                Text Comparison
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 border-r border-slate-200" colSpan={3}>
                Model Comparison
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                Distance
              </th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 w-1/4 border-r border-slate-200">
                <div className="space-y-2">
                  <span>Query Text</span>
                  <Textarea
                    placeholder="Paste multiple query texts (one per line) to bulk upload..."
                    className="text-xs h-16 resize-none"
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        handleBulkUpload('queryText', e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 w-1/4 border-r border-slate-200">
                <div className="space-y-2">
                  <span>Stored Text</span>
                  <Textarea
                    placeholder="Paste multiple stored texts (one per line) to bulk upload..."
                    className="text-xs h-16 resize-none"
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        handleBulkUpload('storedText', e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </th>
              {["model1", "model2", "model3"].map((modelKey, index) => (
                <th key={modelKey} className="px-4 py-2 text-left text-xs font-medium text-slate-600 w-1/6">
                  <Select 
                    value={selectedModels[modelKey]} 
                    onValueChange={(value) => handleModelChange(modelKey, value)}
                  >
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder={`Model ${index + 1}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </th>
              ))}
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">
                Cosine Distance
              </th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row, index) => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 border-r border-slate-200">
                  <Textarea
                    value={row.queryText}
                    onChange={(e) => updateRowText(row.id, 'queryText', e.target.value)}
                    placeholder="Enter query text..."
                    className="w-full h-20 text-sm resize-none"
                  />
                </td>
                <td className="px-4 py-3 border-r border-slate-200">
                  <Textarea
                    value={row.storedText}
                    onChange={(e) => updateRowText(row.id, 'storedText', e.target.value)}
                    placeholder="Enter stored text..."
                    className="w-full h-20 text-sm resize-none"
                  />
                </td>
                {["model1", "model2", "model3"].map((modelKey) => {
                  const model = selectedModels[modelKey];
                  const distance = row.distances[model];
                  const loading = row.loading[model];
                  
                  return (
                    <td key={modelKey} className="px-4 py-3 text-center">
                      {loading && (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        </div>
                      )}
                      {!loading && distance !== null && distance !== undefined && (
                        <div className="text-sm font-mono">
                          {distance.toFixed(4)}
                        </div>
                      )}
                      {!loading && !model && (
                        <div className="text-xs text-slate-400">No model</div>
                      )}
                      {!loading && model && (distance === null || distance === undefined) && (
                        <div className="text-xs text-slate-400">-</div>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3">
                  <div className="text-xs text-slate-500">
                    {Object.values(selectedModels).filter(Boolean).map(model => {
                      const distance = row.distances[model];
                      if (distance !== null && distance !== undefined) {
                        return (
                          <div key={model} className="font-mono">
                            {model.split('-')[2]}: {distance.toFixed(4)}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length === 1}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={7} className="px-4 py-3">
                <Button
                  variant="outline"
                  onClick={addRow}
                  className="w-full py-2 border-2 border-dashed border-slate-300 hover:border-primary hover:text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Text Comparison Row
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}