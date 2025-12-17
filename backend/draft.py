# local_medical_agent.py

import os
import json
import pickle
import torch
import clip
from PIL import Image
from torch.nn.functional import cosine_similarity
from langchain_community.chat_models import ChatLiteLLM


# -------------------------------
# Device
# -------------------------------
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# -------------------------------
# Load fine-tuned CLIP
# -------------------------------
clip_model_path = r"C:\Users\User\OneDrive\Desktop\gui\XMedAgent\model_weights\clip_medical.pth"
model, preprocess = clip.load("ViT-B/32", device=device)
model = model.float()
model.load_state_dict(torch.load(clip_model_path, map_location=device))
model.eval()
print("✅ Fine-tuned CLIP loaded successfully")

# -------------------------------
# Load dataset and map image paths to reports (with caching)
# -------------------------------
annotation_path = r"C:\Users\User\OneDrive\Desktop\gui\XMedAgent\data\iu_xray\annotation.json"
image_base_dir = r"C:\Users\User\OneDrive\Desktop\gui\XMedAgent\data\iu_xray\images"
cache_file = r"C:\Users\User\OneDrive\Desktop\gui\XMedAgent\data\reports_dict.pkl"

if os.path.exists(cache_file):
    # Load cached mapping
    with open(cache_file, "rb") as f:
        reports_dict = pickle.load(f)
    print(f"✅ Loaded cached reports_dict with {len(reports_dict)} entries")
else:
    # Build mapping
    with open(annotation_path, 'r') as f:
        annotations = json.load(f)["train"]

    reports_dict = {}
    for item in annotations:
        report_text = item["report"]
        for rel_path in item["image_path"]:
            # Build full path
            png_path = os.path.join(image_base_dir, rel_path.replace("/", os.sep))
            if os.path.exists(png_path):
                reports_dict[png_path] = report_text

    # Save cache
    with open(cache_file, "wb") as f:
        pickle.dump(reports_dict, f)
    print(f"✅ Built and cached reports_dict with {len(reports_dict)} entries")

# -------------------------------
# Helper functions
# -------------------------------
def truncate_report(text, max_words=75):
    tokens = text.split()
    return " ".join(tokens[:max_words])

def encode_image(image_path):
    image = preprocess(Image.open(image_path)).unsqueeze(0).to(device)
    with torch.no_grad():
        img_feat = model.encode_image(image)
        img_feat /= img_feat.norm(dim=-1, keepdim=True)
    return img_feat

def encode_texts(texts):
    tokens = clip.tokenize(texts, truncate=True).to(device)
    with torch.no_grad():
        txt_feat = model.encode_text(tokens)
        txt_feat /= txt_feat.norm(dim=-1, keepdim=True)
    return txt_feat

# -------------------------------
# Retrieval Agent
# -------------------------------
class RetrievalAgent:
    def __init__(self, clip_model, preprocess, k=5, device='cuda'):
        self.model = clip_model
        self.preprocess = preprocess
        self.device = device
        self.k = k
        self.model.eval()
        print(f"✅ Retrieval Agent initialized. Top-k={self.k}")

    def retrieve_top_k(self, image_path, reports_dict):
        all_reports = list(set(reports_dict.values()))
        text_features = encode_texts(all_reports)
        img_feat = encode_image(image_path)
        sims = cosine_similarity(img_feat, text_features)
        topk_idx = sims.topk(min(self.k, len(all_reports))).indices.tolist()
        top_reports = [all_reports[i] for i in topk_idx]
        top_scores = [sims[i].item() for i in topk_idx]

        for i, (rep, score) in enumerate(zip(top_reports, top_scores)):
            print(f"[{i+1}] Score: {score:.4f}\n{rep}\n{'-'*50}")
        return top_reports

# -------------------------------
# Local LLM Agent using Ollama

class LocalLLMReportAgent:
    def __init__(self, model_name="ollama/deepseek-r1:1.5b"):
        self.llm = ChatLiteLLM(model=model_name, streaming=False)

    def generate_report(self, visual_description):
        prompt = (
            "You are an expert thoracic radiologist. "
            "Using the following X-ray image features, generate a formal radiology report "
            "in narrative style (no bullet points). "
            "Organize the report into sections:\n"
            "FINDINGS: Describe abnormalities and normal structures.\n"
            "IMPRESSION: Summarize diagnostic conclusions.\n"
            "LABELS: List present conditions as words separated by commas.\n\n"
            f"Visual Features: {visual_description}\n"
            "\n=== Start Formal Radiology Report ==="
        )
        response = self.llm.invoke(prompt)
        return response.content if hasattr(response, "content") else str(response)


# -------------------------------
# Example usage
# -------------------------------
if __name__ == "__main__":
    # Example image (replace with any preprocessed image from dataset)
    image_path = os.path.join(image_base_dir, "CXR10_IM-0002", "0.png")

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    # 1️⃣ Retrieve top-k similar reports
    retrieval_agent = RetrievalAgent(model, preprocess, k=5, device=device)
    top_reports = retrieval_agent.retrieve_top_k(image_path, reports_dict)

    # 2️⃣ Generate structured report using local LLM
    llm_agent = LocalLLMReportAgent(model_name="ollama/deepseek-r1:1.5b")
    draft_report = llm_agent.generate_report(top_reports)

    print("\n📝 Draft Radiology Report:\n")
    print(draft_report)
