import { useState, useCallback } from "react";
import { UploadCloud, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import * as pdfjsLib from "pdfjs-dist";

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).href;

interface ResumeDropzoneProps {
  onTextExtracted: (text: string) => void;
  className?: string;
}

export function ResumeDropzone({ onTextExtracted, className }: ResumeDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = async (file: File) => {
    if (file.type !== "application/pdf") return;
    
    setIsProcessing(true);
    setFileName(file.name);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPageCount(pdf.numPages);
      
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        fullText += strings.join(" ") + "\n";
      }
      
      onTextExtracted(fullText);
    } catch (e) {
      console.error("Failed to parse PDF", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  }, []);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors",
        isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-accent/50",
        className
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        type="file"
        accept="application/pdf"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={onFileChange}
      />
      {isProcessing ? (
        <div className="flex flex-col items-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Parsing PDF...</p>
        </div>
      ) : fileName ? (
        <div className="flex flex-col items-center space-y-2">
          <FileText className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium">{fileName}</p>
          <p className="text-xs text-muted-foreground">{pageCount} pages parsed</p>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-2">
          <UploadCloud className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Upload Resume (PDF)</p>
          <p className="text-xs text-muted-foreground">Drag & drop or click to browse</p>
        </div>
      )}
    </div>
  );
}
