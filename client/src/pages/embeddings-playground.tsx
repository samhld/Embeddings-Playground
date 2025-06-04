import { useState } from "react";
import { Code } from "lucide-react";
import InputSection from "@/components/input-section";
import ModelComparisonTable from "@/components/model-comparison-table";
import DistanceCalculator from "@/components/distance-calculator";

export default function EmbeddingsPlayground() {
  const [inputText, setInputText] = useState("");
  const [textChunks, setTextChunks] = useState("");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Code className="text-white text-sm" size={16} />
              </div>
              <h1 className="text-xl font-semibold text-slate-800">Embeddings Playground</h1>
            </div>
            <div className="text-sm text-slate-600">
              Test and compare OpenAI embedding models
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Input Section */}
        <InputSection 
          inputText={inputText}
          setInputText={setInputText}
          textChunks={textChunks}
          setTextChunks={setTextChunks}
        />

        {/* Model Comparison Table */}
        <ModelComparisonTable inputText={inputText} />

        {/* Distance Calculator */}
        <DistanceCalculator />

        {/* Status Bar */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span className="text-slate-600">API Status: <span className="text-success font-medium">Connected</span></span>
              </div>
              <div className="text-slate-500">|</div>
              <div className="text-slate-600">
                OpenAI Embeddings API Ready
              </div>
            </div>
            <div className="text-slate-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
