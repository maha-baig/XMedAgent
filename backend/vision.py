# local_radiology_agent.py

import os
import torch
import numpy as np
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms
import timm
from langchain_community.chat_models import ChatLiteLLM  # <-- Use this instead of Ollama

# -------------------------------
# Device
# -------------------------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# -------------------------------
# Vision Encoder + Projection
# -------------------------------
class VisionEncoderWithProjection(nn.Module):
    def __init__(self, device="cuda", vit_name="vit_base_patch16_224", embed_dim=768, dropout_prob=0.1):
        super().__init__()
        self.device = device
        self.visual_extractor = timm.create_model(
            vit_name, pretrained=True, num_classes=0, global_pool=''
        )
        vit_feat_dim = self.visual_extractor.num_features
        for p in self.visual_extractor.parameters():
            p.requires_grad = False
        self.visual_projection = nn.Sequential(
            nn.Linear(vit_feat_dim, embed_dim),
            nn.GELU(),
            nn.Dropout(dropout_prob),
            nn.Linear(embed_dim, embed_dim)
        )

    def extract_visual_tokens(self, images):
        images = images.to(self.device)
        with torch.no_grad():
            patch_tokens = self.visual_extractor.forward_features(images)
        patch_tokens = patch_tokens[:, 1:, :]  # remove CLS token
        visual_tokens = self.visual_projection(patch_tokens)
        return visual_tokens

class ProjectionHeads(nn.Module):
    def __init__(self, img_dim=768, txt_dim=384, embed_dim=256):
        super().__init__()
        self.image_proj = nn.Sequential(
            nn.Linear(img_dim, embed_dim),
            nn.ReLU(),
            nn.Linear(embed_dim, embed_dim)
        )
        self.text_proj = nn.Sequential(
            nn.Linear(txt_dim, embed_dim),
            nn.ReLU(),
            nn.Linear(embed_dim, embed_dim)
        )

    def forward(self, img_embeds, txt_embeds=None):
        img_embeds = F.normalize(self.image_proj(img_embeds), dim=-1)
        if txt_embeds is not None:
            txt_embeds = F.normalize(self.text_proj(txt_embeds), dim=-1)
            return img_embeds, txt_embeds
        return img_embeds

# -------------------------------
# Image preprocessing
# -------------------------------
image_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

def preprocess_image(image_path):
    img = Image.open(image_path).convert("RGB")
    return image_transform(img).unsqueeze(0)

def get_visual_embeddings(image_paths, vision_model, proj_heads):
    vision_model.eval()
    proj_heads.eval()
    images = [preprocess_image(p) for p in image_paths]
    images = torch.cat(images).to(device)

    with torch.no_grad():
        patch_tokens = vision_model.extract_visual_tokens(images)  # [V, N, 768]
        patch_tokens = patch_tokens.flatten(0,1)                   # [V*N, 768]
        img_embeds = proj_heads.image_proj(patch_tokens)           # [V*N, 256]
        img_embeds = img_embeds.mean(dim=0, keepdim=True)          # [1, 256]
    return img_embeds

# -------------------------------
# Convert embeddings -> textual description
# -------------------------------
def embeddings_to_text(img_embed, top_k=12):
    vec = img_embed.squeeze().cpu().numpy()
    idx = np.argsort(vec)[-top_k:][::-1]
    return ", ".join([f"dim{int(i)}={vec[i]:.2f}" for i in idx])

# -------------------------------
# Local LLM Agent using ChatLiteLLM
# -------------------------------
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
# Load trained weights
# -------------------------------
vision_model = VisionEncoderWithProjection(device=device).to(device)
proj_heads = ProjectionHeads(img_dim=768, txt_dim=384, embed_dim=256).to(device)


proj_ckpt = r"C:\Users\User\OneDrive\Desktop\gui\XMedAgent\model_weights\proj_heads.pth"
proj_heads.load_state_dict(torch.load(proj_ckpt, map_location=device))


vision_model.eval()
proj_heads.eval()
print("✅ Vision model and projection heads loaded successfully")

# -------------------------------
# Example usage
# -------------------------------
image_paths = [r"C:\Users\User\OneDrive\Desktop\gui\XMedAgent\data\iu_xray\images\CXR688_IM-2256/0.png"]

# Get embeddings
img_embed = get_visual_embeddings(image_paths, vision_model, proj_heads)

# Convert embeddings to textual description
visual_desc = embeddings_to_text(img_embed)

# Generate report using local LLM
agent = LocalLLMReportAgent(model_name="ollama/deepseek-r1:1.5b")
report = agent.generate_report(visual_desc)

print("\nGenerated Radiology Report:\n")
print(report)
