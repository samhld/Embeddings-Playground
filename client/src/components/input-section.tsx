import { useState, useEffect } from "react";
import { Info } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { countTokens } from "@/lib/token-counter";

interface InputSectionProps {
  inputText1: string;
  setInputText1: (text: string) => void;
  inputText2: string;
  setInputText2: (text: string) => void;
}

export default function InputSection({ 
  inputText1, 
  setInputText1,
  inputText2,
  setInputText2
}: InputSectionProps) {
  const [inputTokens1, setInputTokens1] = useState(0);
  const [chunkCount1, setChunkCount1] = useState(0);
  const [inputTokens2, setInputTokens2] = useState(0);
  const [chunkCount2, setChunkCount2] = useState(0);

  useEffect(() => {
    setInputTokens1(countTokens(inputText1));
    const chunks1 = inputText1.split('\n').filter(chunk => chunk.trim().length > 0);
    setChunkCount1(chunks1.length);
  }, [inputText1]);

  useEffect(() => {
    setInputTokens2(countTokens(inputText2));
    const chunks2 = inputText2.split('\n').filter(chunk => chunk.trim().length > 0);
    setChunkCount2(chunks2.length);
  }, [inputText2]);

  const renderInputBox = (
    title: string,
    inputText: string,
    setInputText: (text: string) => void,
    inputTokens: number,
    chunkCount: number
  ) => {
    const isMultipleChunks = chunkCount > 1;
    const hasTokenLimit = inputTokens > 500;
    const hasChunkLimit = chunkCount > 100;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
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
    );
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 mb-8">
      {renderInputBox("Input Text 1", inputText1, setInputText1, inputTokens1, chunkCount1)}
      {renderInputBox("Input Text 2", inputText2, setInputText2, inputTokens2, chunkCount2)}
    </div>
  );
}
