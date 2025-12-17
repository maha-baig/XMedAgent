from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import shutil
import uuid
import os

from backend.synthesis import (
    LocalSynthesisAgent,
    RetrievalAgent,
    LocalLLMReportAgent,
    VisionLLMAgent,
    reports_dict,
    model,
    preprocess,
    device
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/api/synthesize-report")
async def synthesize_report(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    image_path = os.path.join(UPLOAD_DIR, f"{file_id}.png")

    with open(image_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    retrieval_agent = RetrievalAgent(model, preprocess, k=5, device=device)
    draft_agent = LocalLLMReportAgent(model_name="ollama/deepseek-r1:1.5b")
    vision_agent = VisionLLMAgent(model_name="ollama/deepseek-r1:1.5b")
    synthesis_agent = LocalSynthesisAgent(model_name="ollama/deepseek-r1:1.5b")

    final_report = synthesis_agent.generate_final_report(
        draft_agent=draft_agent,
        vision_agent=vision_agent,
        retrieval_agent=retrieval_agent,
        reports_dict=reports_dict,
        image_paths=[image_path]
    )

    return {
        "final_report": final_report
    }
