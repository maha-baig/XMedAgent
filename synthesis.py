# synthesis.py

from langchain_community.chat_models import ChatLiteLLM
from draft import (
    RetrievalAgent,
    LocalLLMReportAgent,
    reports_dict,
    model,
    preprocess,
    device
)
from vision import (
    get_visual_embeddings,
    embeddings_to_text,
    vision_model,
    proj_heads,
    LocalLLMReportAgent as VisionLLMAgent
)

# -------------------------------
# Local Synthesis Agent
# -------------------------------
class LocalSynthesisAgent:
    """
    Synthesis Agent:
    Integrates Draft Agent and Vision Agent outputs into a single,
    clinically grounded radiology report.

    Design principles:
    - Use ONLY findings present in the inputs
    - No hallucinated or speculative observations
    - Preserve original clinical meaning
    - Resolve overlap without redundancy
    """

    def __init__(self, model_name="ollama/deepseek-r1:1.5b"):
        self.llm = ChatLiteLLM(model=model_name, streaming=False)

    def generate_final_report(
        self,
        draft_agent,
        vision_agent,
        retrieval_agent,
        reports_dict,
        image_paths
    ):
        # -------------------------------
        # 1️⃣ Vision Agent Report
        # -------------------------------
        img_embed = get_visual_embeddings(
            image_paths, vision_model, proj_heads
        )
        vision_features = embeddings_to_text(img_embed)
        vision_report = vision_agent.generate_report(vision_features)

        print("\n🎨 Vision Agent Report:\n")
        print(vision_report)

        # -------------------------------
        # 2️⃣ Draft Agent Report
        # -------------------------------
        top_reports = retrieval_agent.retrieve_top_k(
            image_paths[0], reports_dict
        )
        draft_report = draft_agent.generate_report(top_reports)

        print("\n📝 Draft Agent Report:\n")
        print(draft_report)

        # -------------------------------
        # 3️⃣ Synthesis (FINAL STEP)
        # -------------------------------
        synthesis_prompt = f"""
You are an expert thoracic radiologist acting as a **Synthesis Agent**.

Your task is to generate a FINAL radiology report by integrating:
1) A draft report derived from similar historical cases
2) A vision-based report derived from direct image analysis

STRICT RULES:
- Include ONLY findings explicitly present in either input
- Do NOT introduce new abnormalities or diagnoses
- Do NOT speculate or infer unsupported conclusions
- Preserve original clinical meaning and terminology
- If both inputs mention the same finding, merge them coherently
- If there is disagreement, prefer the vision-based finding
- Avoid unnecessary rewriting or stylistic embellishment
- **Remove any technical codes, labels, or placeholders like "dim91", "dim28", or similar.**
- Only use standard anatomical and radiological terminology.
- Output should be clean and clinically readable.

OUTPUT FORMAT (continuous narrative, no bullet points):

FINDINGS:
Describe abnormalities and normal structures supported by the inputs.

IMPRESSION:
Summarize key diagnostic conclusions derived strictly from findings.

LABELS:
Comma-separated list of present conditions only.

-----------------------
DRAFT REPORT:
{draft_report}

-----------------------
VISION REPORT:
{vision_report}

-----------------------
FINAL RADIOLOGY REPORT:
"""


        response = self.llm.invoke(synthesis_prompt)
        final_report = (
            response.content if hasattr(response, "content") else str(response)
        )

        print("\n✅ Final Synthesized Radiology Report:\n")
        print(final_report)

        return final_report


# -------------------------------
# Example Usage
# -------------------------------
if __name__ == "__main__":

    image_paths = [
        r"C:\Users\User\OneDrive\Desktop\gui\XMedAgent\data\iu_xray\images\CXR3655_IM-1817/0.png"
    ]

    retrieval_agent = RetrievalAgent(
        model, preprocess, k=5, device=device
    )

    draft_agent = LocalLLMReportAgent(
        model_name="ollama/deepseek-r1:1.5b"
    )

    vision_agent = VisionLLMAgent(
        model_name="ollama/deepseek-r1:1.5b"
    )

    synthesis_agent = LocalSynthesisAgent(
        model_name="ollama/deepseek-r1:1.5b"
    )

    final_report = synthesis_agent.generate_final_report(
        draft_agent=draft_agent,
        vision_agent=vision_agent,
        retrieval_agent=retrieval_agent,
        reports_dict=reports_dict,
        image_paths=image_paths
    )

    save_path = (
        r"C:\Users\User\OneDrive\Desktop\gui\XMedAgent\data\final_report.txt"
    )

    with open(save_path, "w", encoding="utf-8") as f:
        f.write(final_report)

    print(f"\n📄 Final report saved to: {save_path}")
