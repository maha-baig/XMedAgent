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
  AlertCircle,
  Brain,
  FileText,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

type ProcessingStep = 'idle' | 'uploading' | 'preprocessing' | 'analyzing' | 'generating' | 'complete';

const processingSteps = [
  { id: 'uploading', label: 'Uploading Image', icon: Upload },
  { id: 'preprocessing', label: 'Preprocessing', icon: RefreshCw },
  { id: 'analyzing', label: 'AI Analysis', icon: Brain },
  { id: 'generating', label: 'Generating Report', icon: FileText },
];

// Hardcoded report data
const mockReport = {
  patientInfo: {
    id: "P-2024-001",
    date: new Date().toLocaleDateString(),
    modality: "Chest X-ray (PA)",
  },
  findings: [
    {
      region: "Lungs",
      observation: "Both lung fields are clear with no evidence of consolidation, masses, or pleural effusion.",
      confidence: 0.94,
      severity: "normal",
    },
    {
      region: "Heart",
      observation: "Cardiac silhouette is within normal limits. No cardiomegaly observed.",
      confidence: 0.92,
      severity: "normal",
    },
    {
      region: "Mediastinum",
      observation: "Mediastinal contours are unremarkable. Trachea is midline.",
      confidence: 0.89,
      severity: "normal",
    },
    {
      region: "Bones",
      observation: "Visualized osseous structures show no acute abnormality.",
      confidence: 0.91,
      severity: "normal",
    },
    {
      region: "Diaphragm",
      observation: "Both hemidiaphragms are well-defined with normal costophrenic angles.",
      confidence: 0.93,
      severity: "normal",
    },
  ],
  impression: "Normal chest radiograph. No acute cardiopulmonary abnormality identified.",
  recommendations: "Routine follow-up as clinically indicated.",
  evidenceLinks: [
    { concept: "Clear lung fields", graphNode: "LUNG_NORMAL" },
    { concept: "Normal cardiac silhouette", graphNode: "HEART_NORMAL" },
    { concept: "Midline trachea", graphNode: "TRACHEA_MIDLINE" },
  ],
};

const UploadXray = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<ProcessingStep>('idle');
  const [progress, setProgress] = useState(0);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFile = useCallback((file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/dicom'];
    const isValidType = validTypes.some(type => file.type.includes(type.split('/')[1])) || 
                        file.name.toLowerCase().endsWith('.dcm') ||
                        file.name.toLowerCase().endsWith('.dicom');
    
    if (!isValidType) {
      alert('Please upload a valid image file (DICOM, JPEG, PNG, or WebP)');
      return;
    }

    setUploadedFile(file);
    
    // Create preview for image files
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      // For DICOM files, use a placeholder
      setPreviewUrl('/placeholder.svg');
    }

    // Start processing simulation
    simulateProcessing();
  }, []);

  const simulateProcessing = useCallback(() => {
    const steps: ProcessingStep[] = ['uploading', 'preprocessing', 'analyzing', 'generating', 'complete'];
    let stepIndex = 0;
    let currentProgress = 0;

    setCurrentStep(steps[0]);
    setProgress(0);

    const interval = setInterval(() => {
      currentProgress += 2;
      setProgress(currentProgress);

      if (currentProgress >= (stepIndex + 1) * 25 && stepIndex < steps.length - 1) {
        stepIndex++;
        setCurrentStep(steps[stepIndex]);
      }

      if (currentProgress >= 100) {
        clearInterval(interval);
        setCurrentStep('complete');
      }
    }, 100);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }, [processFile]);

  const resetUpload = useCallback(() => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setCurrentStep('idle');
    setProgress(0);
  }, []);

  const getStepStatus = (stepId: string) => {
    const stepOrder = ['uploading', 'preprocessing', 'analyzing', 'generating'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(stepId);

    if (currentStep === 'complete') return 'complete';
    if (stepIndex < currentIndex) return 'complete';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <Layout>
      <section className="py-12 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Upload & Analyze <span className="text-primary">X-ray</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Upload your chest X-ray or CT image for AI-powered analysis and evidence-linked report generation.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Upload Section */}
            <div className="space-y-6">
              {/* Upload Area */}
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  {!uploadedFile ? (
                    <div
                      className={cn(
                        "relative p-8 border-2 border-dashed rounded-lg m-4 transition-all duration-300 cursor-pointer",
                        dragActive 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('file-input')?.click()}
                    >
                      <input
                        id="file-input"
                        type="file"
                        className="hidden"
                        accept=".dcm,.dicom,image/jpeg,image/png,image/webp"
                        onChange={handleFileInput}
                      />
                      
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                          <Upload className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          Drop your X-ray image here
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          or click to browse files
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {['DICOM', 'JPEG', 'PNG', 'WebP'].map((format) => (
                            <span key={format} className="px-3 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground">
                              {format}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-muted mb-4">
                        {previewUrl && (
                          <img 
                            src={previewUrl} 
                            alt="Uploaded X-ray" 
                            className="w-full h-full object-contain"
                          />
                        )}
                        {currentStep !== 'complete' && currentStep !== 'idle' && (
                          <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm flex items-center justify-center">
                            <div className="text-center text-primary-foreground">
                              <Loader2 className="w-12 h-12 mx-auto mb-2 animate-spin" />
                              <p className="font-medium">Processing...</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <FileImage className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium text-foreground text-sm truncate max-w-[200px]">
                              {uploadedFile.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={resetUpload}>
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Processing Steps */}
              {uploadedFile && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Processing Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Progress value={progress} className="h-2" />
                    
                    <div className="space-y-3">
                      {processingSteps.map((step) => {
                        const status = getStepStatus(step.id);
                        return (
                          <div 
                            key={step.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg transition-all",
                              status === 'active' && "bg-primary/10",
                              status === 'complete' && "bg-medical-success/10",
                              status === 'pending' && "opacity-50"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center",
                              status === 'complete' && "bg-medical-success text-primary-foreground",
                              status === 'active' && "bg-primary text-primary-foreground",
                              status === 'pending' && "bg-muted text-muted-foreground"
                            )}>
                              {status === 'complete' ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : status === 'active' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <step.icon className="w-4 h-4" />
                              )}
                            </div>
                            <span className={cn(
                              "font-medium",
                              status === 'active' && "text-primary",
                              status === 'complete' && "text-medical-success",
                              status === 'pending' && "text-muted-foreground"
                            )}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Report Section */}
            <div className="space-y-6">
              {currentStep === 'complete' ? (
                <>
                  <Card className="border-primary/30 shadow-glow">
                    <CardHeader className="border-b border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary-foreground" />
                          </div>
                          <div>
                            <CardTitle>Radiology Report</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Generated on {mockReport.patientInfo.date}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      {/* Patient Info */}
                      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground">Patient ID</p>
                          <p className="font-medium">{mockReport.patientInfo.id}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Date</p>
                          <p className="font-medium">{mockReport.patientInfo.date}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Modality</p>
                          <p className="font-medium">{mockReport.patientInfo.modality}</p>
                        </div>
                      </div>

                      {/* Findings */}
                      <div>
                        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Brain className="w-4 h-4 text-primary" />
                          Findings
                        </h4>
                        <div className="space-y-3">
                          {mockReport.findings.map((finding, index) => (
                            <div key={index} className="p-3 bg-muted/30 rounded-lg border border-border/50">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-primary">{finding.region}</span>
                                <span className="text-xs bg-medical-success/20 text-medical-success px-2 py-0.5 rounded-full">
                                  {(finding.confidence * 100).toFixed(0)}% confidence
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{finding.observation}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Impression */}
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          Impression
                        </h4>
                        <p className="text-foreground">{mockReport.impression}</p>
                      </div>

                      {/* Recommendations */}
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Recommendations</h4>
                        <p className="text-muted-foreground">{mockReport.recommendations}</p>
                      </div>

                      {/* Evidence Links */}
                      <div>
                        <h4 className="font-semibold text-foreground mb-3">Evidence Links</h4>
                        <div className="flex flex-wrap gap-2">
                          {mockReport.evidenceLinks.map((link, index) => (
                            <Link 
                              key={index}
                              to="/knowledge-graph"
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent/10 text-accent rounded-full text-sm hover:bg-accent/20 transition-colors"
                            >
                              {link.concept}
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-4">
                    <Link to="/image-mapping" className="flex-1">
                      <Button variant="outline" className="w-full">
                        View Image Mapping
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link to="/knowledge-graph" className="flex-1">
                      <Button variant="default" className="w-full">
                        Explore Knowledge Graph
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <Card className="h-full flex items-center justify-center min-h-[400px]">
                  <CardContent className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Report Yet
                    </h3>
                    <p className="text-muted-foreground">
                      Upload an X-ray image to generate an AI-powered radiology report.
                    </p>
                  </CardContent>
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
