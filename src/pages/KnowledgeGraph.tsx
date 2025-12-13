import { useState, useCallback, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Network, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Info,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

// Hardcoded knowledge graph data
const graphData = {
  nodes: [
    { id: "chest_xray", label: "Chest X-ray", type: "modality", x: 400, y: 50 },
    { id: "lungs", label: "Lungs", type: "anatomy", x: 200, y: 150 },
    { id: "heart", label: "Heart", type: "anatomy", x: 400, y: 150 },
    { id: "mediastinum", label: "Mediastinum", type: "anatomy", x: 600, y: 150 },
    { id: "lung_normal", label: "Clear Lung Fields", type: "finding", x: 100, y: 280 },
    { id: "consolidation", label: "Consolidation", type: "finding", x: 200, y: 350 },
    { id: "pleural_effusion", label: "Pleural Effusion", type: "finding", x: 100, y: 420 },
    { id: "cardiomegaly", label: "Cardiomegaly", type: "finding", x: 350, y: 280 },
    { id: "heart_normal", label: "Normal Cardiac Size", type: "finding", x: 450, y: 280 },
    { id: "trachea_midline", label: "Trachea Midline", type: "finding", x: 550, y: 280 },
    { id: "widened_mediastinum", label: "Widened Mediastinum", type: "finding", x: 700, y: 280 },
    { id: "pneumonia", label: "Pneumonia", type: "diagnosis", x: 150, y: 500 },
    { id: "heart_failure", label: "Heart Failure", type: "diagnosis", x: 350, y: 420 },
    { id: "normal", label: "Normal Study", type: "diagnosis", x: 500, y: 420 },
    { id: "aortic_aneurysm", label: "Aortic Aneurysm", type: "diagnosis", x: 650, y: 420 },
  ],
  links: [
    { source: "chest_xray", target: "lungs" },
    { source: "chest_xray", target: "heart" },
    { source: "chest_xray", target: "mediastinum" },
    { source: "lungs", target: "lung_normal" },
    { source: "lungs", target: "consolidation" },
    { source: "lungs", target: "pleural_effusion" },
    { source: "heart", target: "cardiomegaly" },
    { source: "heart", target: "heart_normal" },
    { source: "mediastinum", target: "trachea_midline" },
    { source: "mediastinum", target: "widened_mediastinum" },
    { source: "consolidation", target: "pneumonia" },
    { source: "pleural_effusion", target: "heart_failure" },
    { source: "cardiomegaly", target: "heart_failure" },
    { source: "lung_normal", target: "normal" },
    { source: "heart_normal", target: "normal" },
    { source: "trachea_midline", target: "normal" },
    { source: "widened_mediastinum", target: "aortic_aneurysm" },
  ],
};

const nodeTypeColors: Record<string, { bg: string; border: string; text: string }> = {
  modality: { bg: "bg-primary/20", border: "border-primary", text: "text-primary" },
  anatomy: { bg: "bg-accent/20", border: "border-accent", text: "text-accent" },
  finding: { bg: "bg-medical-success/20", border: "border-medical-success", text: "text-medical-success" },
  diagnosis: { bg: "bg-medical-warning/20", border: "border-medical-warning", text: "text-medical-warning" },
};

const nodeDescriptions: Record<string, string> = {
  chest_xray: "Primary imaging modality for thoracic examination",
  lungs: "Paired respiratory organs, bilateral lung fields assessed",
  heart: "Cardiac silhouette and size evaluation",
  mediastinum: "Central thoracic compartment containing major vessels",
  lung_normal: "No infiltrates, masses, or effusions identified",
  consolidation: "Airspace opacity indicating fluid/pus in alveoli",
  pleural_effusion: "Fluid accumulation in pleural space",
  cardiomegaly: "Enlarged cardiac silhouette (CTR > 0.5)",
  heart_normal: "Cardiac silhouette within normal limits",
  trachea_midline: "Trachea in central position, no deviation",
  widened_mediastinum: "Increased mediastinal width > 8cm",
  pneumonia: "Infectious consolidation of lung parenchyma",
  heart_failure: "Cardiac decompensation with pulmonary congestion",
  normal: "No acute cardiopulmonary abnormality identified",
  aortic_aneurysm: "Abnormal dilation of the aorta",
};

const KnowledgeGraph = () => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const filteredNodes = useMemo(() => {
    if (!searchQuery) return graphData.nodes;
    return graphData.nodes.filter(node => 
      node.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const getNodePosition = useCallback((nodeId: string) => {
    const node = graphData.nodes.find(n => n.id === nodeId);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  }, []);

  const isNodeHighlighted = useCallback((nodeId: string) => {
    if (!hoveredNode && !selectedNode) return true;
    const targetNode = hoveredNode || selectedNode;
    if (nodeId === targetNode) return true;
    return graphData.links.some(
      link => (link.source === targetNode && link.target === nodeId) ||
              (link.target === targetNode && link.source === nodeId)
    );
  }, [hoveredNode, selectedNode]);

  const isLinkHighlighted = useCallback((source: string, target: string) => {
    if (!hoveredNode && !selectedNode) return true;
    const targetNode = hoveredNode || selectedNode;
    return source === targetNode || target === targetNode;
  }, [hoveredNode, selectedNode]);

  return (
    <Layout>
      <section className="py-12 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Clinical <span className="text-primary">Knowledge Graph</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explore the interconnected medical concepts, findings, and diagnoses used for evidence-linked report generation.
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Controls Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              {/* Search */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Search Nodes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search concepts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Legend */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Legend</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(nodeTypeColors).map(([type, colors]) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className={cn("w-4 h-4 rounded-full border-2", colors.bg, colors.border)} />
                      <span className="text-sm capitalize text-foreground">{type}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Zoom Controls */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">View Controls</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setZoom(1)}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* Selected Node Info */}
              {selectedNode && (
                <Card className="border-primary/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Info className="w-4 h-4 text-primary" />
                        Node Details
                      </CardTitle>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedNode(null)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const node = graphData.nodes.find(n => n.id === selectedNode);
                      if (!node) return null;
                      const colors = nodeTypeColors[node.type];
                      return (
                        <div className="space-y-3">
                          <div>
                            <Badge className={cn(colors.bg, colors.text, "border", colors.border)}>
                              {node.type}
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-foreground">{node.label}</h4>
                          <p className="text-sm text-muted-foreground">
                            {nodeDescriptions[node.id]}
                          </p>
                          <div className="pt-2 border-t border-border">
                            <p className="text-xs text-muted-foreground">
                              Connected to {graphData.links.filter(l => l.source === node.id || l.target === node.id).length} nodes
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Graph Visualization */}
            <Card className="lg:col-span-3 overflow-hidden">
              <CardHeader className="border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Network className="w-5 h-5 text-primary" />
                    Knowledge Graph Visualization
                  </CardTitle>
                  <Badge variant="secondary">
                    {graphData.nodes.length} nodes • {graphData.links.length} connections
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative w-full h-[600px] overflow-auto bg-muted/30">
                  <svg 
                    width="100%" 
                    height="100%" 
                    viewBox="0 0 800 600"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                    className="transition-transform duration-200"
                  >
                    {/* Links */}
                    {graphData.links.map((link, index) => {
                      const sourcePos = getNodePosition(link.source);
                      const targetPos = getNodePosition(link.target);
                      const highlighted = isLinkHighlighted(link.source, link.target);
                      return (
                        <line
                          key={index}
                          x1={sourcePos.x}
                          y1={sourcePos.y}
                          x2={targetPos.x}
                          y2={targetPos.y}
                          stroke={highlighted ? "hsl(var(--primary))" : "hsl(var(--border))"}
                          strokeWidth={highlighted ? 2 : 1}
                          strokeOpacity={highlighted ? 0.6 : 0.3}
                          className="transition-all duration-200"
                        />
                      );
                    })}

                    {/* Nodes */}
                    {filteredNodes.map((node) => {
                      const colors = nodeTypeColors[node.type];
                      const highlighted = isNodeHighlighted(node.id);
                      const isSelected = selectedNode === node.id;
                      return (
                        <g
                          key={node.id}
                          transform={`translate(${node.x}, ${node.y})`}
                          onClick={() => setSelectedNode(node.id)}
                          onMouseEnter={() => setHoveredNode(node.id)}
                          onMouseLeave={() => setHoveredNode(null)}
                          className="cursor-pointer"
                          style={{ opacity: highlighted ? 1 : 0.3 }}
                        >
                          <circle
                            r={isSelected ? 28 : 24}
                            fill="hsl(var(--card))"
                            stroke={isSelected ? "hsl(var(--primary))" : "hsl(var(--border))"}
                            strokeWidth={isSelected ? 3 : 2}
                            className="transition-all duration-200"
                          />
                          <circle
                            r={16}
                            fill={`hsl(var(--${node.type === 'modality' ? 'primary' : 
                                              node.type === 'anatomy' ? 'accent' : 
                                              node.type === 'finding' ? 'medical-success' : 
                                              'medical-warning'}) / 0.2)`}
                          />
                          <text
                            y={40}
                            textAnchor="middle"
                            fontSize="11"
                            fill="hsl(var(--foreground))"
                            fontWeight={isSelected ? "600" : "500"}
                            className="pointer-events-none"
                          >
                            {node.label.length > 15 ? node.label.substring(0, 15) + '...' : node.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { label: "Medical Concepts", value: graphData.nodes.length },
              { label: "Connections", value: graphData.links.length },
              { label: "Anatomical Regions", value: graphData.nodes.filter(n => n.type === 'anatomy').length },
              { label: "Diagnoses", value: graphData.nodes.filter(n => n.type === 'diagnosis').length },
            ].map((stat, index) => (
              <Card key={index}>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default KnowledgeGraph;
