import { useState, useEffect } from "react";
import { Info } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { countTokens } from "@/lib/token-counter";

interface InputSectionProps {
  inputText: string;
  setInputText: (text: string) => void;
}

export default function InputSection({ 
  inputText, 
  setInputText
}: InputSectionProps) {
  const [inputTokens, setInputTokens] = useState(0);
  const [chunkCount, setChunkCount] = useState(0);

  useEffect(() => {
    setInputTokens(countTokens(inputText));
    // Count chunks if input contains line breaks
    const chunks = inputText.split('\n').filter(chunk => chunk.trim().length > 0);
    setChunkCount(chunks.length);
  }, [inputText]);

  const isMultipleChunks = chunkCount > 1;
  const hasTokenLimit = inputTokens > 500;
  const hasChunkLimit = chunkCount > 100;

  return (
    <div className="mb-8">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold text-slate-800">Input Text</h2>
            <Tooltip>
              <TooltipTrigger>
                <Info className="text-slate-400 cursor-help" size={16} />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <div className="space-y-2 text-sm">
                  <p><strong>Single text:</strong> Enter any text up to 500 tokens to generate embeddings.</p>
                  <p><strong>Multiple chunks:</strong> Separate different texts with line breaks. Maximum 100 chunks, each up to 500 tokens.</p>
                  <p>Use chunks to compare embeddings across different pieces of text.</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="text-right">
            <div className={`text-sm ${hasTokenLimit ? 'text-red-500' : 'text-slate-500'}`}>
              {inputTokens} / 500 tokens
            </div>
            {isMultipleChunks && (
              <div className={`text-xs ${hasChunkLimit ? 'text-red-500' : 'text-slate-500'}`}>
                {chunkCount} / 100 chunks
              </div>
            )}
          </div>
        </div>
        
        <Textarea 
          placeholder="Enter text to be embedded... (separate multiple texts with line breaks for chunks)"
          className="h-40 resize-none"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        
        <div className="mt-3 flex items-start text-sm text-slate-600">
          <Info className="mr-2 mt-0.5 flex-shrink-0" size={16} />
          <div>
            {isMultipleChunks ? (
              <span>
                Processing {chunkCount} text chunks. Each chunk limited to 500 tokens.
                {hasChunkLimit && <span className="text-red-500 ml-1">Chunk limit exceeded!</span>}
              </span>
            ) : (
              <span>
                Single text mode. Maximum 500 tokens allowed.
                {hasTokenLimit && <span className="text-red-500 ml-1">Token limit exceeded!</span>}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
