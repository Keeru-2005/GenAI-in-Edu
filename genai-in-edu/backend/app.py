from dotenv import load_dotenv
import os
load_dotenv()
from response_handler import extract_text_from_pdf, summarize_text, ask_question
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification, T5Tokenizer, T5ForConditionalGeneration
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import torch
import re
from transformers import pipeline
from context_manager import update_context, get_context
from graph_logger import log_interaction 
from fastapi.staticfiles import StaticFiles
from video_generator import create_video_from_script
import uuid


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Serve generated videos as static files
app.mount("/videos", StaticFiles(directory="generated_videos"), name="videos")

# Logging setup
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Models
tokenizer = DistilBertTokenizer.from_pretrained("distilbert-base-uncased")
intent_model = DistilBertForSequenceClassification.from_pretrained("distilbert-base-uncased", num_labels=3)
embedder = SentenceTransformer("all-MiniLM-L6-v2")
t5_tokenizer = T5Tokenizer.from_pretrained("t5-small")
t5_model = T5ForConditionalGeneration.from_pretrained("t5-small")

dimension = 384
index = faiss.IndexFlatL2(dimension)

# Simple memory simulation (no LangChain dependency)
chat_history = []

def classify_intent(message):
    intent_classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
    user_message = re.sub(r'\s+', ' ', message).strip()
    try:
        candidate_labels = ["summarize", "explain", "compare", "general", "analyze"]
        result = intent_classifier(user_message, candidate_labels)
        intent = result["labels"][0]
        return intent.lower()
    except Exception as e:
        print("Error in intent classification:", e)
        return "general"


pdf_text = ""
pdf_chunks = []

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    logger.info("Received PDF upload request")
    try:
        global pdf_text
        # Read the entire uploaded file into memory
        file_bytes = await file.read()

        # Extract text directly from bytes using fitz
        pdf_text = extract_text_from_pdf(file_bytes)

        if not pdf_text.strip():
            return {"text": "", "message": "No text extracted from PDF."}

        return {"text": pdf_text}

    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        return {"error": str(e)}

from context_manager import update_context, get_context  # ⬅️ add this import at the top

def build_modality_instruction(modality: str):
    if modality == "audio":
        return (
            "Explain as if you are speaking aloud to the student. "
            "Use conversational tone, pauses, and examples."
        )

    if modality == "video":
        return (
            "Create a detailed video lesson script with the following structure:\n"
            "- Each section should have a title and timestamp like 'Section Title (MM:SS - MM:SS)'\n"
            "- Include 'Visuals:' describing what should appear on screen\n"
            "- Include 'Narration:' with the exact spoken words in quotes\n"
            "- Make it educational, engaging, and clear\n"
            "- Total duration should be 3-5 minutes\n"
        )

    if modality == "diagram":
        # return (
        #     "Now generate a diagram for the question."
        #     "Create a visual explanation using Mermaid diagrams. Follow these rules:\n\n"
        #     "You MUST generate VALID Mermaid syntax.\n\n"
        #     "STRICT RULES (DO NOT BREAK):\n"
        #     "1. ALWAYS include at least one Mermaid diagram in your response\n"
        #     "2. Output Mermaid code ONLY inside a fenced block like:\n"
        #     "```mermaid\n...\n```\n"
        #     "3. Use ONLY these diagram types:\n"
        #     "   - graph TD or graph LR\n"
        #     "   - sequenceDiagram\n"
        #     "   - classDiagram\n"
        #     "   - mindmap\n"
        #     "4. DO NOT invent keywords.\n"
        #     "5. DO NOT use title, header, subgraph titles with styling.\n"
        #     "6. DO NOT use inline styling on edges.\n"
        #     "7. Node labels must be simple text.\n"
        #     "8. No emojis.\n"
        #     "9. Use clear node labels and connections\n"
        #     "10. Make diagrams comprehensive and detailed\n"
        #     "11. Keep syntax minimal and correct.\n\n"
        #     "VALID EXAMPLES:\n\n"
        #     "```mermaid\n"
        #     "graph TD\n"
        #     "  A[Start] --> B[Process]\n"
        #     "  B --> C[End]\n"
        #     "```\n\n"
        #     "```mermaid\n"
        #     "sequenceDiagram\n"
        #     "  User->>System: Request\n"
        #     "  System-->>User: Response\n"
        #     "```\n\n"
        #     "Brief introduction...\n\n"
        #     "```mermaid\n"
        #     "graph TD\n"
        #     "    A[Start] --> B[Process]\n"
        #     "    B --> C[End]\n"
        #     "```\n\n"
        #     "Explanation of the diagram...\n"
        # )
        return (
            "Now generate a diagram for the question.\n"
            "Create a visual explanation using Mermaid diagrams. Follow these rules:\n\n"
            "You MUST generate VALID Mermaid syntax.\n\n"
            "STRICT RULES (DO NOT BREAK):\n"
            "1. ALWAYS include at least one Mermaid diagram in your response\n"
            "2. Output Mermaid code ONLY inside a fenced block like:\n"
            "```mermaid\n...\n```\n"
            "3. Use ONLY these diagram types:\n"
            "   - graph TD or graph LR\n"
            "   - sequenceDiagram\n"
            "   - classDiagram\n"
            "   - mindmap\n"
            "4. DO NOT invent keywords.\n"
            "5. DO NOT use titles or styling.\n"
            "6. Node labels must be simple text.\n"
            "7. No emojis.\n"
            "8. Keep syntax minimal and correct.\n\n"
            "9. Make diagrams comprehensive and detailed\n"
            "Brief introduction...\n\n"
            "VALID EXAMPLES:\n\n"
            "FOLLOW THESE SYNTAX EXAMPLES EXACTLY:\n\n"
            "```mermaid\n"
            "sequenceDiagram\n"
            "  participant User\n"
            "  participant System\n"
            "  User->>System: Request\n"
            "  System-->>User: Response\n"
            "```\n\n"
            "```mermaid\n"
            "graph TD\n"
            "  Start --> Input\n"
            "  Input --> Process\n"
            "  Process --> End\n"
            "```\n\n"
            "```mermaid\n"
            "graph LR\n"
            "  A --> B\n"
            "  B --> C\n"
            "  C --> D\n"
            "```\n\n"
            "```mermaid\n"
            "mindmap\n"
            "  Root\n"
            "    Child1\n"
            "    Child2\n"
            "```\n\n"
            "Explanation of the diagram...\n"
            "```\n\n"
        )



    # default: text
    return "Explain clearly in text with good structure."


@app.post("/process-message")
async def process_message(message: str = Form(...), 
                          pdfContent: str = Form(...), 
                          user_id: str = Form(...), 
                          modality: str = Form("text")):
    logger.info(f"User {user_id} sent message: {message}")
    # logger.info(f"Received message: {message}")
    try:
        intent = classify_intent(message)
        logger.info(f"Detected intent: {intent}")

        query_embedding = embedder.encode(message).reshape(1, -1)
        _, indices = index.search(query_embedding, k=5)

        # --- 🔹 Base PDF context ---
        pdf_context = (
            " ".join(
                [pdf_chunks[i] for i in indices[0] if 0 <= i < len(pdf_chunks)]
            ) or pdf_text
        )
        if not pdf_context:
            pdf_context = "No PDF content."

        # --- 🔹 Add semantic memory context ---
        semantic_context = get_context()
        context = semantic_context + "\n\n" + pdf_context  # Combine both

        # --- 🔹 Handle intent ---
        if intent == "summarize":
            logger.info("Processing summary")
            summary = summarize_text(pdf_text)
            response = summary if summary.strip() else "Could not summarize."
        else:  # general or explain
            logger.info("Processing query")
            # response = ask_question(context, message)
            modality_instruction = build_modality_instruction(modality)

            prompt = f"""
            {modality_instruction}

            Context:
            {context}

            Question:
            {message}
            """

            response = ask_question(prompt, message)
            # print("Generated response:", response)

            response = response if response.strip() else "No relevant info found."
            
            
            # 🎬 VIDEO MODE - Generate actual video
        if modality == "video":
            try:
                logger.info("🎬 Generating video from script...")
                
                # Generate unique filename
                video_id = str(uuid.uuid4())
                output_filename = f"{video_id}.mp4"
                
                # Generate video
                video_path = create_video_from_script(response, output_filename)
                
                if video_path and os.path.exists(video_path):
                    # Return video URL that frontend can access
                    video_url = f"http://localhost:8000/videos/{output_filename}"
                    
                    update_context(message, response)
                    log_interaction(
                        user_id=user_id,
                        content_id="video_generation",
                        event_type=intent,
                        modality=modality,
                    )
                    
                    return {
                        "type": "video",
                        "video_url": video_url,
                        "script": response
                    }
                else:
                    logger.error("Video generation failed")
                    return {
                        "type": "text",
                        "response": "Video generation failed. Here's the script:\n\n" + response
                    }
                    
            except Exception as e:
                logger.error(f"Error generating video: {str(e)}")
                return {
                    "type": "text",
                    "response": f"Video generation error: {str(e)}\n\nScript:\n{response}"
                }
        

        # --- 🔹 Update long-term conversation context ---
        update_context(message, response)
        log_interaction(
            user_id=user_id,
            content_id="chat_general",
            event_type=intent,
            modality=modality,
        )
        return {"response": response}

    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        return {"response": f"Error: {str(e)}"}

# @app.post("/process-message")
# async def process_message(message: str = Form(...), pdfContent: str = Form(...)):
#     logger.info(f"Received message: {message}")
#     try:
#         # if not pdf_chunks:
#         #     logger.warning("No PDF content available")
#         #     return {"response": "Please upload a PDF first."}
        
#         intent = classify_intent(message)
#         logger.info(f"Detected intent: {intent}")

#         query_embedding = embedder.encode(message).reshape(1, -1)
#         _, indices = index.search(query_embedding, k=5)
#         context = " ".join([pdf_chunks[i] for i in indices[0] if i < len(pdf_chunks) and i >= 0]) or pdf_text if pdf_text else "No PDF content."

#         if intent == "summarize":
#             logger.info("Processing summary")
#             summary = summarize_text(pdf_text)
#             return {"response": summary if summary.strip() else "Could not summarize."}
#         else:  # general or explain
#             logger.info("Processing query")
#             response = ask_question(context, message)
#             return {"response": response if response.strip() else "No relevant info found."}

#     except Exception as e:
#         logger.error(f"Error processing message: {str(e)}")
#         return {"response": f"Error: {str(e)}"}



# ## run: python -m uvicorn app:app --reload