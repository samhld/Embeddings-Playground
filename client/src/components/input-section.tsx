import { useState, useEffect } from "react";
import { Info } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { countTokens } from "@/lib/token-counter";

interface InputSectionProps {
  inputText: string;
  setInputText: (text: string) => void;
  textChunks: string;
  setTextChunks: (chunks: string) => void;
}

export default function InputSection({ 
  inputText, 
  setInputText, 
  textChunks, 
  setTextChunks 
}: InputSectionProps) {
  const [inputTokens, setInputTokens] = useState(0);
  const [chunkCount, setChunkCount] = useState(0);

  useEffect(() => {
    setInputTokens(countTokens(inputText));
  }, [inputText]);

  useEffect(() => {
    const chunks = textChunks.split('\n').filter(chunk => chunk.trim().length > 0);
    setChunkCount(chunks.length);
  }, [textChunks]);

  return (
    <div className="grid lg:grid-cols-2 gap-8 mb-8">
      {/* Text Input */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Input Text</h2>
          <span className={`text-sm ${inputTokens > 500 ? 'text-red-500' : 'text-slate-500'}`}>
            {inputTokens} / 500 tokens
          </span>
        </div>
        <Textarea 
          placeholder="Enter text to be embedded..."
          className="h-32 resize-none"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <div className="mt-3 flex items-center text-sm text-slate-600">
          <Info className="mr-2" size={16} />
          Maximum 500 tokens allowed
        </div>
      </div>

      {/* Text Chunks */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Text Chunks</h2>
          <span className={`text-sm ${chunkCount > 100 ? 'text-red-500' : 'text-slate-500'}`}>
            {chunkCount} / 100 chunks
          </span>
        </div>
        <Textarea 
          placeholder="Enter text chunks (one per line, max 100 chunks, 500 tokens each)..."
          className="h-32 resize-none"
          value={textChunks}
          onChange={(e) => setTextChunks(e.target.value)}
        />
        <div className="mt-3 flex items-center text-sm text-slate-600">
          <Info className="mr-2" size={16} />
          Maximum 100 chunks, 500 tokens each
        </div>
      </div>
    </div>
  );
}
