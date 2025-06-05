import { useState, useRef } from "react";
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
  const [queryTexts, setQueryTexts] = useState<string[]>([""]);
  const [storedTexts, setStoredTexts] = useState<string[]>([""]);
  const [selectedModels, setSelectedModels] = useState<{ [key: string]: string }>({
    "model1": "",
    "model2": "",
    "model3": ""
  });
  const [distances, setDistances] = useState<{ [key: string]: number | null }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const queryFileRef = useRef<HTMLInputElement>(null);
  const storedFileRef = useRef<HTMLInputElement>(null);
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

  const addQueryText = () => {
    setQueryTexts(prev => [...prev, ""]);
  };

  const addStoredText = () => {
    setStoredTexts(prev => [...prev, ""]);
  };

  const removeQueryText = (index: number) => {
    if (queryTexts.length > 1) {
      setQueryTexts(prev => prev.filter((_, i) => i !== index));
    }
  };

  const removeStoredText = (index: number) => {
    if (storedTexts.length > 1) {
      setStoredTexts(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateQueryText = (index: number, value: string) => {
    setQueryTexts(prev => prev.map((text, i) => i === index ? value : text));
  };

  const updateStoredText = (index: number, value: string) => {
    setStoredTexts(prev => prev.map((text, i) => i === index ? value : text));
  };

  const handleModelChange = (column: string, model: string) => {
    setSelectedModels(prev => ({ ...prev, [column]: model }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'query' | 'stored') => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const chunks = parseTextChunks(text);
      
      if (chunks.length === 0) {
        toast({
          title: "No Text Found",
          description: "The uploaded file doesn't contain any valid text chunks",
          variant: "destructive",
        });
        return;
      }

      if (type === 'query') {
        setQueryTexts(chunks);
      } else {
        setStoredTexts(chunks);
      }

      toast({
        title: "File Uploaded",
        description: `Loaded ${chunks.length} text chunks`,
      });

    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to read the file",
        variant: "destructive",
      });
    }

    // Clear the input
    event.target.value = '';
  };

  const parseTextChunks = (text: string): string[] => {
    // Handle CSV by splitting on commas first, then newlines
    let chunks: string[] = [];
    
    if (text.includes(',') && text.includes('\n')) {
      // Likely CSV format
      const lines = text.split('\n');
      for (const line of lines) {
        const cells = line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
        chunks.push(...cells.filter(cell => cell.length > 0));
      }
    } else {
      // Text document, split by newlines
      chunks = text.split('\n').map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);
    }
    
    return chunks;
  };

  const generateDistanceForPair = async (queryIndex: number, storedIndex: number, model: string) => {
    const queryText = queryTexts[queryIndex]?.trim();
    const storedText = storedTexts[storedIndex]?.trim();
    
    if (!queryText || !storedText || !model) return;

    const key = `${queryIndex}-${storedIndex}-${model}`;
    
    // Set loading state
    setLoading(prev => ({ ...prev, [key]: true }));

    try {
      // Generate embeddings
      const queryResult = await generateEmbeddingMutation.mutateAsync({ text: queryText, model });
      const storedResult = await generateEmbeddingMutation.mutateAsync({ text: storedText, model });

      // Calculate distance
      const distanceResult = await calculateDistanceMutation.mutateAsync({
        embeddingA: queryResult.embedding,
        embeddingB: storedResult.embedding,
      });

      setDistances(prev => ({ ...prev, [key]: distanceResult.distance }));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate distance",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
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

    const maxLength = Math.max(queryTexts.length, storedTexts.length);
    setIsGenerating(true);

    try {
      // Generate distances for all valid pairs across all models
      for (let i = 0; i < maxLength; i++) {
        const queryText = queryTexts[i]?.trim();
        const storedText = storedTexts[i]?.trim();
        
        if (queryText && storedText) {
          for (const model of activeModels) {
            await generateDistanceForPair(i, i, model);
          }
        }
      }

      toast({
        title: "Comparison Complete",
        description: `Generated distances for ${activeModels.length} models`,
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

  const maxRows = Math.max(queryTexts.length, storedTexts.length);

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
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700" colSpan={3}>
                Model Comparison
              </th>
            </tr>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 w-1/3 border-r border-slate-200">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Query Text</span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => queryFileRef.current?.click()}
                        className="text-xs h-6"
                      >
                        <Upload className="mr-1 h-3 w-3" />
                        Upload
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addQueryText}
                        className="text-xs h-6"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <input
                    ref={queryFileRef}
                    type="file"
                    accept=".txt,.csv"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'query')}
                  />
                </div>
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 w-1/3 border-r border-slate-200">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Stored Text</span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => storedFileRef.current?.click()}
                        className="text-xs h-6"
                      >
                        <Upload className="mr-1 h-3 w-3" />
                        Upload
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addStoredText}
                        className="text-xs h-6"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <input
                    ref={storedFileRef}
                    type="file"
                    accept=".txt,.csv"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'stored')}
                  />
                </div>
              </th>
              {["model1", "model2", "model3"].map((modelKey, index) => (
                <th key={modelKey} className="px-4 py-2 text-left text-xs font-medium text-slate-600 w-1/9">
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {Array.from({ length: maxRows }, (_, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 border-r border-slate-200">
                  {rowIndex < queryTexts.length ? (
                    <div className="space-y-2">
                      <Textarea
                        value={queryTexts[rowIndex]}
                        onChange={(e) => updateQueryText(rowIndex, e.target.value)}
                        placeholder="Enter query text..."
                        className="w-full h-20 text-sm resize-none"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQueryText(rowIndex)}
                        className="text-xs text-slate-400 hover:text-red-500 h-6"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="h-20 bg-slate-50 rounded border-2 border-dashed border-slate-200"></div>
                  )}
                </td>
                <td className="px-4 py-3 border-r border-slate-200">
                  {rowIndex < storedTexts.length ? (
                    <div className="space-y-2">
                      <Textarea
                        value={storedTexts[rowIndex]}
                        onChange={(e) => updateStoredText(rowIndex, e.target.value)}
                        placeholder="Enter stored text..."
                        className="w-full h-20 text-sm resize-none"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStoredText(rowIndex)}
                        className="text-xs text-slate-400 hover:text-red-500 h-6"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="h-20 bg-slate-50 rounded border-2 border-dashed border-slate-200"></div>
                  )}
                </td>
                {["model1", "model2", "model3"].map((modelKey) => {
                  const model = selectedModels[modelKey];
                  if (!model) {
                    return (
                      <td key={modelKey} className="px-4 py-3 text-center">
                        <div className="text-xs text-slate-400">No model</div>
                      </td>
                    );
                  }

                  // Check if we have both texts for this row
                  const hasQueryText = rowIndex < queryTexts.length && queryTexts[rowIndex].trim();
                  const hasStoredText = rowIndex < storedTexts.length && storedTexts[rowIndex].trim();
                  
                  if (!hasQueryText || !hasStoredText) {
                    return (
                      <td key={modelKey} className="px-4 py-3 text-center">
                        <div className="text-xs text-slate-400">-</div>
                      </td>
                    );
                  }

                  const distanceKey = `${rowIndex}-${rowIndex}-${model}`;
                  const distance = distances[distanceKey];
                  const isLoading = loading[distanceKey];
                  
                  return (
                    <td key={modelKey} className="px-4 py-3 text-center">
                      {isLoading && (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        </div>
                      )}
                      {!isLoading && distance !== null && distance !== undefined && (
                        <div className="text-sm font-mono bg-slate-100 rounded p-1">
                          {distance.toFixed(4)}
                        </div>
                      )}
                      {!isLoading && (distance === null || distance === undefined) && (
                        <div className="text-xs text-slate-400">-</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}