import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  variant?: "dark" | "light";
  className?: string;
}

export function CodeBlock({ code, language = "json", variant = "dark", className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className={cn("code-block relative", variant, className)}>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 text-gray-400 hover:text-white"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      <pre className="overflow-x-auto">
        <code className="text-sm font-mono">
          {typeof code === "string" ? code : JSON.stringify(code, null, 2)}
        </code>
      </pre>
    </div>
  );
}
