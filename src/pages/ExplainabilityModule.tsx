import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSearch, Info, Activity, Sparkles } from "lucide-react";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const ExplainabilityModule = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const previewUrl = useMemo(() => {
    const state = location.state as {
      previewUrl?: string;
      image?: string;
    } | null;
    return state?.previewUrl || state?.image || null;
  }, [location.state]);

  // Function to convert base64/URL to Gemini format
  async function urlToGenerativePart(url: string) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(",")[1];
        resolve({
          inlineData: { data: base64Data, mimeType: blob.type },
        });
      };
      reader.readAsDataURL(blob);
    });
  }

  const {
    data: explanation,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["gemini-explain", previewUrl],
    queryFn: async () => {
      if (!previewUrl) return null;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const imagePart = await urlToGenerativePart(previewUrl);

      const prompt = `
        Act as an expert Radiologist and AI Explainer. 
        I am showing a patient their original X-ray alongside a Grad-CAM heatmap that highlights where the AI model is 'looking'.
        The heatmap is currently showing intensity in the central and lower lung regions.
        
        Based on this image, provide a professional but accessible explanation:
        1. Distinguish between the 'Original Scan' (raw anatomy) and the 'Grad-CAM' (AI focus areas).
        2. Explain why an AI might focus on these specific regions in a chest X-ray.
        3. Provide a disclaimer that this is an experimental interpretability tool.
        Format with clear headings and bullet points.
      `;

      const result = await model.generateContent([prompt, imagePart as any]);
      const response = await result.response;
      return response.text();
    },
    enabled: !!previewUrl,
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" /> AI Interpretability
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Explainability Module
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Our dual-view system bridges the gap between raw medical imaging and
            AI decision-making patterns.
          </p>
        </div>

        {!previewUrl ? (
          <Card className="border-dashed py-20 text-center">
            <FileSearch className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Image Found</h3>
            <Button onClick={() => navigate("/upload")}>Upload X-Ray</Button>
          </Card>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Original Image */}
              <Card className="overflow-hidden border-2 transition-all hover:border-primary/50">
                <CardHeader className="bg-muted/50 py-3">
                  <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                    <Activity className="w-4 h-4" /> Original Scan
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex items-center justify-center bg-black aspect-square">
                  <img
                    src={previewUrl}
                    alt="Original"
                    className="max-h-full object-contain"
                  />
                </CardContent>
              </Card>

              {/* Heatmap Image */}
              <Card className="overflow-hidden border-2 transition-all hover:border-primary/50">
                <CardHeader className="bg-muted/50 py-3">
                  <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                    <Info className="w-4 h-4" /> Grad-CAM Attention Map
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 relative flex items-center justify-center bg-black aspect-square">
                  <img
                    src={previewUrl}
                    alt="Heatmap base"
                    className="max-h-full object-contain opacity-80"
                  />
                  <div
                    className="absolute inset-0 pointer-events-none mix-blend-color-dodge opacity-70"
                    style={{
                      background: `radial-gradient(circle at 50% 60%, rgba(255,0,0,0.8) 0%, rgba(255,165,0,0.4) 30%, transparent 60%)`,
                    }}
                  />
                </CardContent>
              </Card>
            </div>

            {/* AI Explanation Section */}
            <Card className="border-primary/20 shadow-lg overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary via-blue-500 to-primary animate-pulse" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Automated Diagnostic Narrative
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-4 w-[90%]" />
                    <Skeleton className="h-4 w-[80%]" />
                    <Skeleton className="h-4 w-[95%]" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : isError ? (
                  <p className="text-destructive">
                    Failed to generate explanation. Please check your API key.
                  </p>
                ) : (
                  <ScrollArea className="h-[350px] pr-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
                      {explanation}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ExplainabilityModule;
