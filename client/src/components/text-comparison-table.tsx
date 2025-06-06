import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Play, Upload, Plus, Trash2, Download, X, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  { value: "BAAI/bge-small-en-v1.5", label: "BAAI/bge-small-en-v1.5" },
];

export default function TextComparisonTable() {
  const [queryTexts, setQueryTexts] = useState<string[]>([""]);
  const [storedTexts, setStoredTexts] = useState<string[]>([""]);
  const [selectedModels, setSelectedModels] = useState<{ [key: string]: string }>({
    "model1": "",
    "model2": "",
    "model3": "",
    "model4": ""
  });
  const [distances, setDistances] = useState<{ [key: string]: number | null }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Track last calculated state to avoid unnecessary recalculations
  const [lastCalculatedState, setLastCalculatedState] = useState<{ [key: string]: { queryText: string; storedText: string; model: string } }>({});
  
  // Track which rows are marked as "related"
  const [relatedRows, setRelatedRows] = useState<{ [key: number]: boolean }>({});
  
  // Track optimal thresholds for each model
  const [optimalThresholds, setOptimalThresholds] = useState<{ [key: string]: number | null }>({});
  
  // Track plot visibility state
  const [showPlot, setShowPlot] = useState(false);
  
  const queryFileRef = useRef<HTMLInputElement>(null);
  const storedFileRef = useRef<HTMLInputElement>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Calculate optimal thresholds function
  const calculateOptimalThresholds = () => {
    const activeModels = Object.values(selectedModels).filter(Boolean);
    const newThresholds: { [key: string]: number | null } = {};
    
    activeModels.forEach(model => {
      const relatedDistances: number[] = [];
      
      // Collect distances for rows marked as related
      Object.keys(relatedRows).forEach(rowIndexStr => {
        const rowIndex = parseInt(rowIndexStr);
        if (relatedRows[rowIndex]) {
          const key = `${rowIndex}-${rowIndex}-${model}`;
          const distance = distances[key];
          if (distance !== null && distance !== undefined) {
            relatedDistances.push(distance);
          }
        }
      });
      
      // Calculate optimal threshold as minimum value greater than all related distances
      if (relatedDistances.length > 0) {
        const maxRelatedDistance = Math.max(...relatedDistances);
        // Add small buffer to ensure threshold is greater than all related distances
        newThresholds[model] = Math.round((maxRelatedDistance + 0.001) * 10000) / 10000;
      } else {
        newThresholds[model] = null;
      }
    });
    
    setOptimalThresholds(newThresholds);
  };

  // Recalculate optimal thresholds when distances or related rows change
  useEffect(() => {
    calculateOptimalThresholds();
  }, [distances, relatedRows, selectedModels]);

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
    // Clear distances for this row when text changes
    clearDistancesForRow(index);
  };

  const updateStoredText = (index: number, value: string) => {
    setStoredTexts(prev => prev.map((text, i) => i === index ? value : text));
    // Clear distances for this row when text changes
    clearDistancesForRow(index);
  };

  const clearDistancesForRow = (rowIndex: number) => {
    const activeModels = Object.values(selectedModels).filter(Boolean);
    setDistances(prev => {
      const updated = { ...prev };
      activeModels.forEach(model => {
        const key = `${rowIndex}-${rowIndex}-${model}`;
        delete updated[key];
      });
      return updated;
    });
    
    setLastCalculatedState(prev => {
      const updated = { ...prev };
      activeModels.forEach(model => {
        const key = `${rowIndex}-${rowIndex}-${model}`;
        delete updated[key];
      });
      return updated;
    });
  };

  const toggleRelated = (rowIndex: number) => {
    setRelatedRows(prev => ({
      ...prev,
      [rowIndex]: !prev[rowIndex]
    }));
  };

  const handleModelChange = (column: string, model: string) => {
    const oldModel = selectedModels[column];
    setSelectedModels(prev => ({ ...prev, [column]: model }));
    
    // Clear distances for the old model and trigger recalculation for new model
    if (oldModel !== model) {
      clearDistancesForModel(oldModel);
      if (model) {
        // Auto-calculate distances for the new model
        autoCalculateForModel(model);
      }
    }
  };

  const clearDistancesForModel = (model: string) => {
    if (!model) return;
    
    setDistances(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (key.endsWith(`-${model}`)) {
          delete updated[key];
        }
      });
      return updated;
    });
    
    setLastCalculatedState(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (key.endsWith(`-${model}`)) {
          delete updated[key];
        }
      });
      return updated;
    });
  };

  const autoCalculateForModel = async (model: string) => {
    const maxLength = Math.max(queryTexts.length, storedTexts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const queryText = queryTexts[i]?.trim();
      const storedText = storedTexts[i]?.trim();
      
      if (queryText && storedText) {
        await generateDistanceForPair(i, i, model);
      }
    }
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      try {
        // Parse CSV content
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length === 0) return;

        // Check if first line looks like headers (contains common header words)
        const firstLine = lines[0].toLowerCase();
        const hasHeaders = firstLine.includes('query') || firstLine.includes('stored') || firstLine.includes('related');
        
        const dataLines = hasHeaders ? lines.slice(1) : lines;
        
        const newQueryTexts: string[] = [];
        const newStoredTexts: string[] = [];
        const newRelatedRows: { [key: number]: boolean } = {};

        dataLines.forEach((line, index) => {
          // Simple CSV parsing (handles basic cases)
          const columns = line.split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
          
          // Assume first column is query, second is stored, third is related
          const queryText = columns[0] || '';
          const storedText = columns[1] || '';
          const relatedValue = columns[2] || '';

          newQueryTexts.push(queryText);
          newStoredTexts.push(storedText);

          // Check if related (case insensitive)
          const isRelated = relatedValue.toLowerCase() === 'related' || relatedValue.toLowerCase() === 'yes';
          if (isRelated) {
            newRelatedRows[index] = true;
          }
        });

        // Update state
        setQueryTexts(newQueryTexts);
        setStoredTexts(newStoredTexts);
        setRelatedRows(newRelatedRows);

        // Clear existing distances since we have new data
        setDistances({});
        setLastCalculatedState({});

        toast({
          title: "CSV uploaded successfully",
          description: `Loaded ${dataLines.length} rows of data`,
        });

      } catch (error) {
        toast({
          title: "Error uploading CSV",
          description: "Please check your CSV format and try again",
          variant: "destructive",
        });
      }
    };

    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  const downloadCSV = () => {
    const activeModels = Object.values(selectedModels).filter(Boolean);
    const maxLength = Math.max(queryTexts.length, storedTexts.length);
    
    // Check if there's any distance data
    const hasDistanceData = Object.keys(distances).some(key => distances[key] !== null && distances[key] !== undefined);
    
    if (!hasDistanceData) {
      toast({
        title: "No data to download",
        description: "Please generate some distance calculations first before downloading.",
        variant: "destructive",
      });
      return;
    }
    
    // Create CSV headers
    const headers = ['Query Text', 'Stored Text'];
    activeModels.forEach(model => {
      headers.push(model);
    });
    
    // Create CSV rows
    const csvRows = [headers.join(',')];
    
    for (let i = 0; i < maxLength; i++) {
      const queryText = queryTexts[i] || '';
      const storedText = storedTexts[i] || '';
      
      const row = [
        `"${queryText.replace(/"/g, '""')}"`, // Escape quotes in CSV
        `"${storedText.replace(/"/g, '""')}"` // Escape quotes in CSV
      ];
      
      activeModels.forEach(model => {
        const key = `${i}-${i}-${model}`;
        const distance = distances[key];
        row.push(distance !== null && distance !== undefined ? distance.toFixed(4) : '');
      });
      
      csvRows.push(row.join(','));
    }
    
    // Add optimal thresholds at the bottom
    const thresholdRow = ['Optimal Threshold', ''];
    activeModels.forEach(model => {
      const threshold = optimalThresholds[model];
      thresholdRow.push(threshold !== null && threshold !== undefined ? threshold.toFixed(4) : '');
    });
    csvRows.push(thresholdRow.join(','));
    
    // Create and download file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `embeddings-comparison-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    toast({
      title: "CSV Downloaded",
      description: `Exported ${maxLength} rows of comparison data with optimal thresholds`,
    });
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

  const generateDistanceForPair = async (queryIndex: number, storedIndex: number, model: string, forceRecalculate: boolean = false) => {
    const queryText = queryTexts[queryIndex]?.trim();
    const storedText = storedTexts[storedIndex]?.trim();
    
    if (!queryText || !storedText || !model) return;

    const key = `${queryIndex}-${storedIndex}-${model}`;
    const lastState = lastCalculatedState[key];
    
    // Check if we need to recalculate
    const needsRecalculation = forceRecalculate || 
      !lastState || 
      lastState.queryText !== queryText || 
      lastState.storedText !== storedText || 
      lastState.model !== model;

    if (!needsRecalculation) {
      // Distance is already calculated and texts haven't changed
      return;
    }
    
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
      
      // Update the last calculated state
      setLastCalculatedState(prev => ({
        ...prev,
        [key]: { queryText, storedText, model }
      }));
      
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

  const plotData = () => {
    // Check if there's any distance data
    const hasDistanceData = Object.keys(distances).some(key => distances[key] !== null && distances[key] !== undefined);
    
    if (!hasDistanceData) {
      toast({
        title: "No data to plot",
        description: "Please generate some distance calculations first before plotting.",
        variant: "destructive",
      });
      return;
    }

    // Toggle the plot visibility
    setShowPlot(!showPlot);
  };

  // Prepare data for plotting
  const getPlotData = () => {
    const relatedDistances: number[] = [];
    const unrelatedDistances: number[] = [];

    Object.keys(distances).forEach(key => {
      const distance = distances[key];
      if (distance !== null && distance !== undefined) {
        // Extract row index from key (format: "rowIndex-rowIndex-model")
        const rowIndex = parseInt(key.split('-')[0]);
        if (relatedRows[rowIndex]) {
          relatedDistances.push(distance);
        } else {
          unrelatedDistances.push(distance);
        }
      }
    });

    return { relatedDistances, unrelatedDistances };
  };

  const createHistogramData = (relatedDistances: number[], unrelatedDistances: number[]) => {
    const allDistances = [...relatedDistances, ...unrelatedDistances];
    if (allDistances.length === 0) return null;

    // Calculate bin count: minimum of row count/10 or 10
    const rowCount = Math.max(queryTexts.length, storedTexts.length);
    const binCount = Math.min(Math.max(Math.floor(rowCount / 10), 1), 10);

    const minDistance = Math.min(...allDistances);
    const maxDistance = Math.max(...allDistances);
    const binWidth = (maxDistance - minDistance) / binCount;

    const relatedBins = Array(binCount).fill(0);
    const unrelatedBins = Array(binCount).fill(0);
    
    const binLabels = Array(binCount).fill(0).map((_, i) => {
      const start = minDistance + i * binWidth;
      const end = start + binWidth;
      return `${start.toFixed(3)}`;
    });

    // Fill bins for related distances
    relatedDistances.forEach(distance => {
      let binIndex = Math.floor((distance - minDistance) / binWidth);
      if (binIndex >= binCount) binIndex = binCount - 1;
      relatedBins[binIndex]++;
    });

    // Fill bins for unrelated distances
    unrelatedDistances.forEach(distance => {
      let binIndex = Math.floor((distance - minDistance) / binWidth);
      if (binIndex >= binCount) binIndex = binCount - 1;
      unrelatedBins[binIndex]++;
    });

    return { relatedBins, unrelatedBins, binLabels, binCount };
  };

  const calculateBoxPlotStats = (data: number[]) => {
    if (data.length === 0) return null;
    
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const median = sorted[Math.floor(sorted.length * 0.5)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    
    return { min, q1, median, q3, max, count: data.length };
  };

  const maxRows = Math.max(queryTexts.length, storedTexts.length);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Text Comparison Table</h2>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => csvFileRef.current?.click()}
              className="px-4"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload CSV
            </Button>
            <Button 
              variant="outline"
              onClick={downloadCSV}
              className="px-4"
            >
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
            <Button 
              onClick={generateComparisons}
              disabled={isGenerating}
              className="px-6"
            >
              <Play className="mr-2 h-4 w-4" />
              {isGenerating ? "Generating..." : "Show Cosine Distances"}
            </Button>
            <input
              ref={csvFileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCSVUpload}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-8"></th>
              <th className="px-2 py-1 text-center text-xs font-medium text-slate-700 border-r border-slate-200" colSpan={2}>
                Text Comparison
              </th>
              <th className="px-2 py-1 text-center text-xs font-medium text-slate-700 w-12 border-r border-slate-200">
                Related?
              </th>
              <th className="px-2 py-1 text-center text-xs font-medium text-slate-700" colSpan={3}>
                Model Comparison
              </th>
            </tr>
            <tr>
              <th className="w-8 px-1 py-1"></th>
              <th className="px-2 py-1 text-left text-xs font-medium text-slate-600 w-1/3 border-r border-slate-200">
                Query Text
              </th>
              <th className="px-2 py-1 text-left text-xs font-medium text-slate-600 w-1/3 border-r border-slate-200">
                Stored Text
              </th>
              <th className="px-2 py-1 text-center text-xs font-medium text-slate-600 w-12 border-r border-slate-200">
                <div className="flex justify-center">
                  <Checkbox className="h-3 w-3" disabled />
                </div>
              </th>
              {["model1", "model2", "model3", "model4"].map((modelKey, index) => (
                <th key={modelKey} className="px-2 py-1 text-left text-xs font-medium text-slate-600 w-1/6">
                  <Select 
                    value={selectedModels[modelKey]} 
                    onValueChange={(value) => handleModelChange(modelKey, value)}
                  >
                    <SelectTrigger className="w-full h-6 text-xs">
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
                <td className="w-8 px-1 py-1">
                  {(rowIndex < queryTexts.length || rowIndex < storedTexts.length) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (rowIndex < queryTexts.length) removeQueryText(rowIndex);
                        if (rowIndex < storedTexts.length) removeStoredText(rowIndex);
                      }}
                      className="text-xs text-slate-400 hover:text-red-500 h-4 w-4 p-0 flex items-center justify-center"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </td>
                <td className="px-2 py-1 border-r border-slate-200">
                  {rowIndex < queryTexts.length ? (
                    <Textarea
                      value={queryTexts[rowIndex]}
                      onChange={(e) => updateQueryText(rowIndex, e.target.value)}
                      placeholder="Enter query text..."
                      className="w-full h-12 text-xs resize-none p-1"
                    />
                  ) : (
                    <div className="h-12 bg-slate-50 rounded border-2 border-dashed border-slate-200"></div>
                  )}
                </td>
                <td className="px-2 py-1 border-r border-slate-200">
                  {rowIndex < storedTexts.length ? (
                    <Textarea
                      value={storedTexts[rowIndex]}
                      onChange={(e) => updateStoredText(rowIndex, e.target.value)}
                      placeholder="Enter stored text..."
                      className="w-full h-12 text-xs resize-none p-1"
                    />
                  ) : (
                    <div className="h-12 bg-slate-50 rounded border-2 border-dashed border-slate-200"></div>
                  )}
                </td>
                <td className="px-2 py-1 border-r border-slate-200">
                  <div className="flex justify-center items-center h-12">
                    {(rowIndex < queryTexts.length && queryTexts[rowIndex].trim()) || 
                     (rowIndex < storedTexts.length && storedTexts[rowIndex].trim()) ? (
                      <Checkbox
                        checked={relatedRows[rowIndex] || false}
                        onCheckedChange={() => toggleRelated(rowIndex)}
                        className="h-4 w-4"
                      />
                    ) : null}
                  </div>
                </td>
                {["model1", "model2", "model3", "model4"].map((modelKey) => {
                  const model = selectedModels[modelKey];
                  if (!model) {
                    return (
                      <td key={modelKey} className="px-1 py-1 text-center">
                        <div className="text-xs text-slate-400">No model</div>
                      </td>
                    );
                  }

                  // Check if we have both texts for this row
                  const hasQueryText = rowIndex < queryTexts.length && queryTexts[rowIndex].trim();
                  const hasStoredText = rowIndex < storedTexts.length && storedTexts[rowIndex].trim();
                  
                  if (!hasQueryText || !hasStoredText) {
                    return (
                      <td key={modelKey} className="px-1 py-1 text-center">
                        <div className="text-xs text-slate-400">-</div>
                      </td>
                    );
                  }

                  const distanceKey = `${rowIndex}-${rowIndex}-${model}`;
                  const distance = distances[distanceKey];
                  const isLoading = loading[distanceKey];
                  
                  return (
                    <td key={modelKey} className="px-1 py-1 text-center">
                      {isLoading && (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                        </div>
                      )}
                      {!isLoading && distance !== null && distance !== undefined && (
                        <div className="text-xs font-mono bg-slate-100 rounded px-1">
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
          <tfoot className="bg-slate-50 border-t border-slate-300">
            <tr>
              <td className="w-8 px-1 py-1"></td>
              <td className="px-2 py-1 text-xs font-medium text-slate-600 border-r border-slate-200">
                Optimal Threshold
              </td>
              <td className="px-2 py-1 border-r border-slate-200"></td>
              <td className="px-2 py-1 border-r border-slate-200"></td>
              {["model1", "model2", "model3", "model4"].map((modelKey) => {
                const model = selectedModels[modelKey];
                const threshold = optimalThresholds[model] || null;
                
                return (
                  <td key={modelKey} className="px-1 py-1 text-center">
                    {model ? (
                      <Input
                        value={threshold !== null ? threshold.toString() : ''}
                        readOnly
                        className="w-full h-6 text-xs text-center bg-slate-100 border-slate-300"
                        placeholder="—"
                      />
                    ) : (
                      <div className="text-xs text-slate-400">—</div>
                    )}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
        
        {/* Add Row and Plot Data Buttons */}
        <div className="p-4 border-t border-slate-200 flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              addQueryText();
              addStoredText();
            }}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={plotData}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
          >
            <BarChart3 className="h-4 w-4" />
            Plot Data
          </Button>
        </div>
      </div>

      {/* Inline Plot Section */}
      {showPlot && (() => {
        const activeModels = Object.values(selectedModels).filter(Boolean);
        
        // Get data by model
        const modelData: { [model: string]: { related: number[], unrelated: number[] } } = {};
        activeModels.forEach(model => {
          modelData[model] = { related: [], unrelated: [] };
        });

        Object.keys(distances).forEach(key => {
          const distance = distances[key];
          if (distance !== null && distance !== undefined) {
            // Key format is: rowIndex-distance-model
            const keyParts = key.split('-');
            if (keyParts.length >= 3) {
              const rowIndex = parseInt(keyParts[0]);
              const model = keyParts.slice(2).join('-'); // Handle model names with dashes
              
              if (activeModels.includes(model)) {
                if (relatedRows[rowIndex]) {
                  modelData[model].related.push(distance);
                } else {
                  modelData[model].unrelated.push(distance);
                }
              }
            }
          }
        });

        // Check if we have any distance data at all
        const totalDistances = Object.keys(distances).filter(key => distances[key] !== null && distances[key] !== undefined).length;
        
        if (totalDistances === 0) {
          return (
            <div className="border-t border-slate-200 p-6 bg-slate-50">
              <div className="text-center text-slate-500">No distance data available for plotting</div>
            </div>
          );
        }

        return (
          <div className="border-t border-slate-200 bg-slate-50">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Distance Distribution Analysis
                </h3>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span className="text-sm font-medium">Related</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span className="text-sm font-medium">Unrelated</span>
                  </div>
                </div>
              </div>

              {/* Box Plots */}
              <div className="bg-white p-6 rounded-lg border">
                <h4 className="text-md font-medium mb-6">Box Plots - Statistical Summary</h4>
                
                <div className="space-y-8">
                  {activeModels.map(model => {
                    const relatedData = modelData[model].related;
                    const unrelatedData = modelData[model].unrelated;
                    const relatedBoxPlot = calculateBoxPlotStats(relatedData);
                    const unrelatedBoxPlot = calculateBoxPlotStats(unrelatedData);
                    
                    // Calculate combined range for consistent scaling
                    const allValues = [...relatedData, ...unrelatedData];
                    const minValue = Math.min(...allValues);
                    const maxValue = Math.max(...allValues);
                    const range = maxValue - minValue || 1;
                    
                    const chartWidth = 600;
                    const chartHeight = 140;
                    const margin = { left: 60, right: 60, top: 15, bottom: 40 };
                    const plotWidth = chartWidth - margin.left - margin.right;
                    const scale = plotWidth / range;
                    
                    return (
                      <div key={model} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-medium">{model}</h5>
                          <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-blue-500 rounded"></div>
                              <span className="text-xs">Related (n={relatedData.length})</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-red-500 rounded"></div>
                              <span className="text-xs">Unrelated (n={unrelatedData.length})</span>
                            </div>
                          </div>
                        </div>
                        
                        <svg width={chartWidth} height={chartHeight} className="border rounded bg-slate-50">
                          <g>
                            {/* Related Box Plot (Top) */}
                            {relatedBoxPlot && (() => {
                              const minX = margin.left + (relatedBoxPlot.min - minValue) * scale;
                              const q1X = margin.left + (relatedBoxPlot.q1 - minValue) * scale;
                              const medianX = margin.left + (relatedBoxPlot.median - minValue) * scale;
                              const q3X = margin.left + (relatedBoxPlot.q3 - minValue) * scale;
                              const maxX = margin.left + (relatedBoxPlot.max - minValue) * scale;
                              const boxY = 25;
                              
                              return (
                                <g>
                                  {/* Related label */}
                                  <text x={15} y={boxY + 15} className="text-xs font-medium" fill="#3b82f6">Related</text>
                                  
                                  {/* Whiskers */}
                                  <line x1={minX} y1={boxY + 15} x2={q1X} y2={boxY + 15} stroke="#3b82f6" strokeWidth="2" />
                                  <line x1={q3X} y1={boxY + 15} x2={maxX} y2={boxY + 15} stroke="#3b82f6" strokeWidth="2" />
                                  <line x1={minX} y1={boxY + 8} x2={minX} y2={boxY + 22} stroke="#3b82f6" strokeWidth="2" />
                                  <line x1={maxX} y1={boxY + 8} x2={maxX} y2={boxY + 22} stroke="#3b82f6" strokeWidth="2" />
                                  
                                  {/* Box */}
                                  <rect 
                                    x={q1X} 
                                    y={boxY + 5} 
                                    width={q3X - q1X} 
                                    height={20} 
                                    fill="#3b82f6" 
                                    fillOpacity="0.3" 
                                    stroke="#3b82f6" 
                                    strokeWidth="2" 
                                  />
                                  
                                  {/* Median line */}
                                  <line 
                                    x1={medianX} 
                                    y1={boxY + 5} 
                                    x2={medianX} 
                                    y2={boxY + 25} 
                                    stroke="#1d4ed8" 
                                    strokeWidth="3" 
                                  />
                                </g>
                              );
                            })()}
                            
                            {/* Unrelated Box Plot (Bottom) */}
                            {unrelatedBoxPlot && (() => {
                              const minX = margin.left + (unrelatedBoxPlot.min - minValue) * scale;
                              const q1X = margin.left + (unrelatedBoxPlot.q1 - minValue) * scale;
                              const medianX = margin.left + (unrelatedBoxPlot.median - minValue) * scale;
                              const q3X = margin.left + (unrelatedBoxPlot.q3 - minValue) * scale;
                              const maxX = margin.left + (unrelatedBoxPlot.max - minValue) * scale;
                              const boxY = 60;
                              
                              return (
                                <g>
                                  {/* Unrelated label */}
                                  <text x={15} y={boxY + 15} className="text-xs font-medium" fill="#ef4444">Unrelated</text>
                                  
                                  {/* Whiskers */}
                                  <line x1={minX} y1={boxY + 15} x2={q1X} y2={boxY + 15} stroke="#ef4444" strokeWidth="2" />
                                  <line x1={q3X} y1={boxY + 15} x2={maxX} y2={boxY + 15} stroke="#ef4444" strokeWidth="2" />
                                  <line x1={minX} y1={boxY + 8} x2={minX} y2={boxY + 22} stroke="#ef4444" strokeWidth="2" />
                                  <line x1={maxX} y1={boxY + 8} x2={maxX} y2={boxY + 22} stroke="#ef4444" strokeWidth="2" />
                                  
                                  {/* Box */}
                                  <rect 
                                    x={q1X} 
                                    y={boxY + 5} 
                                    width={q3X - q1X} 
                                    height={20} 
                                    fill="#ef4444" 
                                    fillOpacity="0.3" 
                                    stroke="#ef4444" 
                                    strokeWidth="2" 
                                  />
                                  
                                  {/* Median line */}
                                  <line 
                                    x1={medianX} 
                                    y1={boxY + 5} 
                                    x2={medianX} 
                                    y2={boxY + 25} 
                                    stroke="#dc2626" 
                                    strokeWidth="3" 
                                  />
                                </g>
                              );
                            })()}
                            
                            {/* Shared X-axis ticks and labels */}
                            {(() => {
                              const tickCount = 6;
                              const tickStep = range / (tickCount - 1);
                              const tickValues = Array.from({ length: tickCount }, (_, i) => minValue + i * tickStep);
                              
                              return tickValues.map((value, i) => {
                                const x = margin.left + (value - minValue) * scale;
                                return (
                                  <g key={i}>
                                    <line x1={x} y1={95} x2={x} y2={105} stroke="#64748b" strokeWidth="1" />
                                    <text x={x} y={120} textAnchor="middle" className="text-xs" fill="#64748b">
                                      {value.toFixed(2)}
                                    </text>
                                  </g>
                                );
                              });
                            })()}
                            
                            {/* X-axis line */}
                            <line x1={margin.left} y1={95} x2={margin.left + plotWidth} y2={95} stroke="#64748b" strokeWidth="1" />
                          </g>
                        </svg>
                        
                        {/* Statistical summaries */}
                        <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
                          {relatedBoxPlot && (
                            <div className="space-y-1">
                              <div className="font-medium text-blue-600">Related Statistics:</div>
                              <div>Min: {relatedBoxPlot.min.toFixed(3)} | Q1: {relatedBoxPlot.q1.toFixed(3)} | Median: {relatedBoxPlot.median.toFixed(3)} | Q3: {relatedBoxPlot.q3.toFixed(3)} | Max: {relatedBoxPlot.max.toFixed(3)}</div>
                            </div>
                          )}
                          {unrelatedBoxPlot && (
                            <div className="space-y-1">
                              <div className="font-medium text-red-600">Unrelated Statistics:</div>
                              <div>Min: {unrelatedBoxPlot.min.toFixed(3)} | Q1: {unrelatedBoxPlot.q1.toFixed(3)} | Median: {unrelatedBoxPlot.median.toFixed(3)} | Q3: {unrelatedBoxPlot.q3.toFixed(3)} | Max: {unrelatedBoxPlot.max.toFixed(3)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}