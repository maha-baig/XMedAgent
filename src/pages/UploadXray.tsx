import { useState, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileImage, 
  Loader2, 
  CheckCircle2, 
  Brain,
  FileText,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Download,
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

type ProcessingStep = 'idle' | 'uploading' | 'analyzing' | 'complete';

interface ParsedReport {
  findings: string;
  impression: string;
  labels: string[];
}

const UploadXray = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<ProcessingStep>('idle');
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<ParsedReport | null>(null);

  // Updated Parser with Flexible Regex for "IMPRESSIONS" or "IMPRESSION"
  const parseReportText = (text: string): ParsedReport => {
    // Looks for FINDINGS: ... until IMPRESSION(S):
    const findingsMatch = text.match(/FINDINGS:([\s\S]*?)(?=IMPRESSIONS?:|$)/i);
    // Looks for IMPRESSION(S): ... until LABELS:
    const impressionMatch = text.match(/IMPRESSIONS?:([\s\S]*?)(?=LABELS:|$)/i);
    // Looks for LABELS: ... until end
    const labelsMatch = text.match(/LABELS:([\s\S]*?)$/i);

    return {
      findings: findingsMatch?.[1]?.trim() || "Findings content not found.",
      impression: impressionMatch?.[1]?.trim() || "Impression content not found.",
      labels: labelsMatch?.[1]
        ? labelsMatch[1].split(',').map(l => l.trim()).filter(l => l !== "")
        : []
    };
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const processFile = useCallback(async (file: File) => {
    setUploadedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setCurrentStep('uploading');
    setProgress(20);

    const formData = new FormData();
    formData.append("file", file);

    try {
      setCurrentStep('analyzing');
      setProgress(45);

      const response = await fetch("http://localhost:8000/api/synthesize-report", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Synthesis failed");

      const data = await response.json();
      
      // The parser now handles "IMPRESSIONS:"
      const parsed = parseReportText(data.final_report);
      setReport(parsed);
      
      setProgress(100);
      setCurrentStep('complete');
    } catch (error) {
      console.error("Error:", error);
      alert("Analysis failed. Ensure backend is running.");
      resetUpload();
    }
  }, []);

  const resetUpload = useCallback(() => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setCurrentStep('idle');
    setProgress(0);
    setReport(null);
  }, []);

  return (
    <Layout>
      <section className="py-12 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              AI Report <span className="text-primary">Synthesis</span>
            </h1>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* LEFT COLUMN: UPLOAD */}
            <div className="space-y-6">
              <Card className="overflow-hidden border-2">
                <CardContent className="p-0">
                  {!uploadedFile ? (
                    <div
                      className={cn(
                        "relative p-12 border-2 border-dashed rounded-lg m-4 transition-all cursor-pointer",
                        dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      )}
                      onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
                      }}
                      onClick={() => document.getElementById('file-input')?.click()}
                    >
                      <input id="file-input" type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
                      <div className="text-center">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
                        <h3 className="text-lg font-semibold">Upload X-ray Image</h3>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-black mb-4">
                        <img src={previewUrl!} alt="X-ray" className="w-full h-full object-contain" />
                        {currentStep !== 'complete' && (
                          <div className="absolute inset-0 bg-background/40 backdrop-blur-md flex items-center justify-center">
                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="truncate max-w-[200px]">{uploadedFile.name}</span>
                        <Button variant="ghost" size="sm" onClick={resetUpload}><RefreshCw className="w-3 h-3 mr-1" /> Reset</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {currentStep !== 'idle' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase">
                    <span>{currentStep}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: REPORT & BUTTONS */}
            <div className="space-y-6">
              {currentStep === 'complete' && report ? (
                <>
                  <Card className="border-primary/20 shadow-xl">
                    <CardHeader className="bg-muted/30 border-b">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="w-5 h-5 text-primary" />
                        Synthesized Report
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      
                      {/* Findings Section */}
                      <section>
                        <h4 className="text-xs font-black uppercase text-muted-foreground mb-2 flex items-center gap-2">
                          <Brain className="w-3 h-3" /> Findings
                        </h4>
                        <div className="text-sm leading-relaxed bg-muted/20 p-4 rounded-md border whitespace-pre-line">
                          {report.findings}
                        </div>
                      </section>

                      {/* Impression Section */}
                      <section>
                        <h4 className="text-xs font-black uppercase text-muted-foreground mb-2 flex items-center gap-2">
                          <Sparkles className="w-3 h-3" /> Impression
                        </h4>
                        <div className="p-4 bg-primary/5 border border-primary/10 rounded-md italic text-sm font-medium leading-relaxed">
                          {report.impression}
                        </div>
                      </section>

                      {/* Labels Section */}
                      <section>
                        <h4 className="text-xs font-black uppercase text-muted-foreground mb-3 flex items-center gap-2">
                          <Tag className="w-3 h-3" /> Labels
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {report.labels.map((label, i) => (
                            <span key={i} className="px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full uppercase">
                              {label}
                            </span>
                          ))}
                        </div>
                      </section>

                    </CardContent>
                  </Card>

                  {/* Navigation Buttons placed directly underneath the Report Card */}
                  <div className="flex gap-4">
                    <Link to="/image-mapping" className="flex-1">
                      <Button variant="outline" className="w-full">
                        View Image Mapping
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </Link>
                    <Link to="/knowledge-graph" className="flex-1">
                      <Button variant="default" className="w-full">
                        Explore Knowledge Graph
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <Card className="h-full min-h-[450px] flex items-center justify-center border-dashed border-2">
                  <div className="text-center p-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-medium">Report will appear here after analysis.</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default UploadXray;
