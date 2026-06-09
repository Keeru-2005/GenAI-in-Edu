# app.py
import os
import base64
import cv2
from focus_tracker import evaluate_frame


from dotenv import load_dotenv
load_dotenv()
from response_handler import extract_text_from_pdf, summarize_text, ask_question, classify_intent
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from context_manager import update_context, get_context
from graph_logger import infer_observed_modality, log_interaction 
from fastapi.staticfiles import StaticFiles
from video_generator import create_video_from_script
import uuid
from graph_logger import get_user_disabilities, create_user_profile, get_all_users, log_impatience_event, get_impatience_history
from pydantic import BaseModel
from graph_logger import upsert_user_disability
from graph_logger import log_emotional_state, get_modality_affinity, log_modality_event
from response_handler import explain_mistakes, extract_concept
from graph_logger import log_focus_score, get_focus_trend_data, get_concept_mastery, delete_user_data
import time
from gtts import gTTS

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # allowing all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("generated_videos", exist_ok=True)
app.mount("/videos", StaticFiles(directory="generated_videos"), name="videos")

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

embedder = SentenceTransformer("all-MiniLM-L6-v2")
dimension = 384

# Session state
user_sessions = {}
video_jobs = {}

class ModalityEvent(BaseModel):
    user_id: str
    modality: str
    event: str
    duration: float = 0.0

@app.post("/log-modality-event")
def log_event(payload: ModalityEvent):
    log_modality_event(
        user_id=payload.user_id,
        modality=payload.modality,
        event=payload.event,
        duration=payload.duration
    )
    return {"status": "logged"}

class DisabilityUpdate(BaseModel):
    user_id: str
    condition: str
    severity: str
    consent: bool

@app.post("/update-disability")
def update_disability(payload: DisabilityUpdate):
    if not payload.consent:
        return {"status": "skipped"}
    upsert_user_disability(
        user_id=payload.user_id,
        condition=payload.condition,
        severity=payload.severity,
        consent=True
    )
    return {"status": "ok"}

def infer_preferred_modality(user_id: str):
    affinity = get_modality_affinity(user_id)
    if not affinity:
        return None
    return affinity[0]["modality"]

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...), user_id: str = Form(...)):
    logger.info("Received PDF upload request")
    try:
        file_bytes = await file.read()
        pdf_text = extract_text_from_pdf(file_bytes)

        if not pdf_text.strip():
            return {"text": "", "message": "No text extracted from PDF."}

        chunk_size = 300
        words = pdf_text.split()
        pdf_chunks = [' '.join(words[i:i + chunk_size]) for i in range(0, len(words), chunk_size)]
        
        index = faiss.IndexFlatL2(dimension)
        if pdf_chunks:
            embeddings = embedder.encode(pdf_chunks)
            index.add(np.array(embeddings))
            
        user_sessions[user_id] = {
            "pdf_text": pdf_text,
            "pdf_chunks": pdf_chunks,
            "index": index
        }

        return {"text": pdf_text}

    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        return {"error": str(e)}

def build_modality_instruction(modality: str):
    if modality == "audio":
        return "Explain as if you are speaking aloud to the student. Use conversational tone, pauses, and examples."
    if modality == "video":
        return (
            "Create a detailed video lesson script with the following structure:\n"
            "- Each section should have a title and timestamp like 'Section Title (MM:SS - MM:SS)'\n"
            "- Include 'Image Search:' with a short 2-3 word topic to search for the background image (e.g. 'cloud computing', 'neural networks')\n"
            "- Include 'Visuals:' providing 2-3 short bullet points summarizing the concepts. These will appear as text on the video slide.\n"
            "- Include 'Narration:' with the exact spoken words in quotes. The narration MUST be a highly detailed, elaborated explanation of the concept, providing much more depth than the bullet points on the slide.\n"
            "- Make it educational, engaging, and clear\n"
            "- Total duration should be 3-5 minutes\n"
        )
    if modality == "diagram":
        return (
            "IMPORTANT: Generate a Mermaid.js flowchart.\n\n"

        "STRICT RULES:\n"
        "- Start EXACTLY with: graph TD\n"
        "- STRICTLY end every line with a semicolon (;)\n"
        "- Use ONLY --> arrows\n"
        "- Use SIMPLE node labels\n"
        "- Keep syntax VALID\n"
        "- Wrap ONLY inside ```mermaid ``` block\n"
        "- Maximum 8 nodes\n"
        "- Avoid complex Mermaid features\n\n"

        "VALID EXAMPLE:\n\n"

        "```mermaid\n"
        "graph TD;\n"
        "A[Input] --> B[Process];\n"
        "B --> C[Output];\n"
        "```\n"
        )
    return "Explain clearly in text with good structure."

def build_disability_instruction(disabilities: dict):
    instructions = []
    if "Dyslexia" in disabilities:
        instructions.append("Use short sentences, simple words, and avoid dense paragraphs.")
    if "ADHD" in disabilities:
        severity = disabilities["ADHD"]
        instructions.append("Use bullet points, headings, and examples. Keep explanations concise and engaging.")
        if severity in ["moderate", "severe"]:
            instructions.append("Break content into small chunks and recap frequently.")
    if "Autism" in disabilities:
        instructions.append("Use structured explanations, clear steps, and avoid metaphors.")
    if "Auditory Processing" in disabilities:
        instructions.append("Use mostly text and visual descriptions. Keep audio explanations strictly supplemental.")
    if "Visual Processing" in disabilities:
        instructions.append("Use high contrast text descriptions, avoid complex visual diagrams, emphasize auditory descriptions.")
    return "\n".join(instructions)

def build_anxiety_structure(anxiety_level: int):
    if anxiety_level <= 3: return {"max_concepts": 5, "sentence_style": "normal", "examples": "optional"}
    if 4 <= anxiety_level <= 6: return {"max_concepts": 3, "sentence_style": "short", "examples": "recommended"}
    return {"max_concepts": 2, "sentence_style": "very short", "examples": "required"}

def build_emotional_instruction(anxiety_level: int, has_depression: bool = False):
    instruction = ""
    if 4 <= anxiety_level <= 6:
        instruction = "Keep the explanation simple and calm. Use short sentences."
    elif anxiety_level > 6:
        instruction = "Start with reassurance that the concept is simple. Explain only one idea at a time. Use very short sentences. Include a gentle real-world example."
    
    if has_depression:
        instruction += " Use an extremely encouraging and supportive tone. Validate their effort frequently and praise them for their progress."
        
    return instruction

def resolve_teaching_strategy(disabilities: dict, user_modality: str, observed_modality: str | None):
    if disabilities:
        severity_rank = {"mild": 1, "moderate": 2, "severe": 3}
        priority = ["Dyslexia", "Autism", "ADHD"]
        dominant = max(disabilities.items(), key=lambda x: (severity_rank.get(x[1], 0), -priority.index(x[0])))
        condition, severity = dominant
        if condition == "ADHD":
            return {"effective_modality": "diagram" if severity == "severe" else "video", "reason": f"ADHD-{severity}: reduce cognitive overload", "framework": "UDL"}
        if condition == "Autism":
            return {"effective_modality": "diagram", "reason": f"Autism-{severity}: preference for visuals", "framework": "Visual Support Theory"}
        if condition == "Dyslexia":
            return {"effective_modality": "diagram" if severity == "severe" else "audio", "reason": f"Dyslexia-{severity}: minimize decoding", "framework": "Orton–Gillingham"}
    if observed_modality:
        return {"effective_modality": observed_modality, "reason": "Inferred preference", "framework": "Behavioral"}
    return {"effective_modality": user_modality, "reason": "User-selected", "framework": "User Control"}

@app.post("/start-focus-session")
def start_focus(user_id: str = Form(...)):
    if user_id not in user_sessions:
        user_sessions[user_id] = {}
    user_sessions[user_id]["focus"] = {
        "active": True,
        "frames_attended": 0,
        "frames_distracted": 0,
        "total_frames": 0,
        "start_time": time.time()
    }
    return {"status": "started"}

class FramePayload(BaseModel):
    user_id: str
    image_base64: str

@app.post("/process-frame")
def process_frame(payload: FramePayload):
    user_id = payload.user_id
    if user_id not in user_sessions or "focus" not in user_sessions.get(user_id, {}) or not user_sessions[user_id]["focus"]["active"]:
        return {"status": "inactive"}
        
    user_sessions[user_id]["focus"]["total_frames"] += 1
    
    try:
        # The base64 string from canvas usually comes as "data:image/jpeg;base64,/9j/4AAQ..."
        b64_data = payload.image_base64.split(",")[1] if "," in payload.image_base64 else payload.image_base64
        img_bytes = base64.b64decode(b64_data)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        is_attended = evaluate_frame(frame)
        if is_attended is True:
            user_sessions[user_id]["focus"]["frames_attended"] += 1
        elif is_attended is False:
            user_sessions[user_id]["focus"]["frames_distracted"] += 1
        # if None (no face), we don't increment either, but total_frames increments to lower the score.
    except Exception as e:
        logger.error(f"Error processing frame: {e}")
        
    return {"status": "processed"}

@app.post("/stop-focus-session")
def stop_focus(user_id: str = Form(...)):
    score = 0.0
    frames = 0
    if user_id in user_sessions and "focus" in user_sessions[user_id]:
        focus_data = user_sessions[user_id]["focus"]
        focus_data["active"] = False
        frames = focus_data["total_frames"]
        attended = focus_data["frames_attended"]
        if frames > 0:
            score = (attended / frames) * 100
            
    score = round(score, 2)
    log_focus_score(user_id, score)
    return {"attention_score": score, "frames": frames}

class ImpatiencePayload(BaseModel):
    user_id: str
    trigger_type: str

@app.post("/log-impatience-event")
def log_impatience(payload: ImpatiencePayload):
    log_impatience_event(payload.user_id, payload.trigger_type)
    logger.info(f"Impatience event logged for {payload.user_id}: triggered by {payload.trigger_type}")
    return {"status": "ok"}

@app.get("/impatience-history/{user_id}")
def fetch_impatience_history(user_id: str):
    history = get_impatience_history(user_id)
    return {"history": history}

class ProfileCreate(BaseModel):
    username: str

@app.post("/create-profile")
def create_profile(payload: ProfileCreate):
    user_id = f"user_{str(uuid.uuid4())[:8]}"
    create_user_profile(user_id, payload.username)
    return {"user_id": user_id, "name": payload.username}

@app.get("/users")
def fetch_users():
    return {"users": get_all_users()}

@app.delete("/delete-user-data/{user_id}")
def delete_data(user_id: str):
    delete_user_data(user_id)
    return {"status": "ok", "message": "All personal data for user has been deleted."}

@app.get("/user-disabilities/{user_id}")
def fetch_user_disabilities(user_id: str):
    disabilities = get_user_disabilities(user_id)
    return {
        "ADHD": disabilities.get("ADHD", "none"),
        "Autism": disabilities.get("Autism", "none"),
        "Dyslexia": disabilities.get("Dyslexia", "none"),
        "consent": True if disabilities else False
    }

class EmotionalStateUpdate(BaseModel):
    user_id: str
    anxiety_level: int

@app.post("/update-emotional-state")
def update_emotional_state(payload: EmotionalStateUpdate):
    log_emotional_state(user_id=payload.user_id, anxiety_level=payload.anxiety_level)
    return {"status": "ok"}

class QuizRequest(BaseModel):
    user_id: str
    topic: str
    context: str

from response_handler import generate_quiz

@app.post("/generate-quiz")
def generate_quiz_api(payload: QuizRequest):
    quiz = generate_quiz(payload.context, payload.topic)
    return {"quiz": quiz}

class QuizSubmission(BaseModel):
    user_id: str
    topic: str
    answers: list
    correct_answers: list
    options : list
    questions : list

from graph_logger import log_concept_mastery

@app.post("/submit-quiz")
def submit_quiz(payload: QuizSubmission):
    score = 0
    total = len(payload.answers)
    wrong_concepts = []
    feedback_details = []

    for i in range(total):
        user_ans = payload.answers[i]
        correct_letter = payload.correct_answers[i]
        correct_index = ord(correct_letter.upper()) - ord('A')
        correct_text = payload.options[i][correct_index]
        if user_ans.strip().lower() == correct_text.strip().lower():
            score += 1
            feedback_details.append(f"Q{i+1}: Correct ✅\n")
        else:
            feedback_details.append(f"Q{i+1}: Wrong ❌\nYour answer: {user_ans}\n\nCorrect: {correct_text}\n")
            wrong_concepts.append({
                "question" : payload.questions[i],
                "user_answer": user_ans,
                "correct_answer": correct_text
            })

    percentage = score / total if total > 0 else 0
    log_concept_mastery(user_id=payload.user_id, concept=payload.topic, score=percentage)
    
    feedback = "Good job! You're understanding the concept well." if percentage >= 0.6 else "You might need a simpler explanation. Let's revisit the concept."
    explanation_text = explain_mistakes(wrong_concepts) if wrong_concepts else ""
    return {"score": percentage, "feedback": feedback, "details": feedback_details, "explanation": explanation_text}

class ExplainPayload(BaseModel):
    user_id: str
    concept: str
    original_explanation: str
    user_explanation: str

@app.post("/evaluate-understanding")
def evaluate_understanding(payload: ExplainPayload):
    prompt = f"Concept: {payload.concept}\nOriginal Explanation: {payload.original_explanation}\nStudent Explanation: {payload.user_explanation}\nEvaluate the student..."
    return {"evaluation": ask_question(prompt, payload.user_explanation)}

@app.get("/focus-trend/{user_id}")
def get_focus_trend(user_id: str):
    result = get_focus_trend_data(user_id)
    scores = [r["score"] for r in result]
    data = [{"session": i + 1, "score": r["score"], "label": r["label"]} for i, r in enumerate(result)]
    trend = "Stable ⚖️"
    if len(scores) < 3: trend = "Not enough data"
    elif scores[-1] > scores[0] + 5: trend = "Improving 📈"
    elif scores[-1] < scores[0] - 5: trend = "Declining 📉"
    return {"data": data, "trend": trend}

@app.get("/user-insights/{user_id}")
def get_user_insights(user_id: str):
    return {
        "disabilities": get_user_disabilities(user_id),
        "preferred_modality": infer_observed_modality(user_id),
        "modality_breakdown": get_modality_affinity(user_id)
    }

@app.get("/concept-mastery/{user_id}")
def concept_mastery(user_id: str):
    return {"mastery": get_concept_mastery(user_id)}

def generate_video_task(job_id: str, script: str, user_id: str, intent: str, modality: str):
    try:
        output_filename = f"{job_id}.mp4"
        video_path = create_video_from_script(script, output_filename)
        if video_path and os.path.exists(video_path):
            video_url = f"http://localhost:8000/videos/{output_filename}"
            video_jobs[job_id] = {"status": "completed", "video_url": video_url, "script": script}
            log_interaction(user_id=user_id, content_id="video_generation", event_type=intent, modality=modality)
        else:
            video_jobs[job_id] = {"status": "failed", "error": "Video path does not exist", "script": script}
    except Exception as e:
        logger.error(f"Error in video task: {e}")
        video_jobs[job_id] = {"status": "failed", "error": str(e), "script": script}

@app.get("/video-status/{job_id}")
def get_video_status(job_id: str):
    return video_jobs.get(job_id, {"status": "not_found"})

@app.post("/generate-audio")
def generate_audio(text: str = Form(...)):
    try:
        audio_id = str(uuid.uuid4())
        audio_path = f"generated_videos/{audio_id}.mp3"
        tts = gTTS(text=text, lang='en', slow=False)
        tts.save(audio_path)
        return {"audio_url": f"http://localhost:8000/videos/{audio_id}.mp3"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/process-message")
async def process_message(background_tasks: BackgroundTasks,
                          message: str = Form(...), 
                          pdfContent: str = Form(...), 
                          user_id: str = Form(...), 
                          modality: str = Form("text"),
                          feedbackGranularity: int = Form(5)):
    anxiety_level = 0
    try:
        intent = classify_intent(message)
        session = user_sessions.get(user_id, {})
        index = session.get("index")
        pdf_chunks = session.get("pdf_chunks", [])
        pdf_text = session.get("pdf_text", "")

        pdf_context = "No PDF content."
        if index and len(pdf_chunks) > 0:
            query_embedding = embedder.encode([message])
            k_val = min(5, len(pdf_chunks))
            _, indices = index.search(np.array(query_embedding), k=k_val)
            pdf_context = " ".join([pdf_chunks[i] for i in indices[0] if 0 <= i < len(pdf_chunks)]) or pdf_text

        context = get_context() + "\n\n" + pdf_context

        if intent == "summarize":
            summary = summarize_text(pdf_text)
            response = summary if summary.strip() else "Could not summarize."
            effective_modality = modality
            strategy = {"reason": "Summary requested", "framework": "Default"}
            concept = "summary"
        else:
            user_disabilities = get_user_disabilities(user_id)
            observed_modality = infer_preferred_modality(user_id)
            strategy = resolve_teaching_strategy(user_disabilities, modality, observed_modality)
            effective_modality = strategy["effective_modality"]

            modality_instruction = build_modality_instruction(effective_modality)
            disability_instruction = build_disability_instruction(user_disabilities)
            anxiety_structure = build_anxiety_structure(anxiety_level)
            emotional_instruction = build_emotional_instruction(anxiety_level, "Depression" in user_disabilities)

            prompt = f"{modality_instruction}\n{disability_instruction}\n{emotional_instruction}\n\nIMPORTANT:\n- Explain at most {anxiety_structure['max_concepts']} main ideas.\n- Use {anxiety_structure['sentence_style']} sentences.\n- Examples are {anxiety_structure['examples']}.\n"
            if feedbackGranularity < 5:
                prompt += "- Provide concise, brief summaries. Avoid overly detailed breakdowns.\n"
            else:
                prompt += "- Provide detailed, step-by-step breakdowns of the concepts.\n"
            prompt += f"Context:\n{context}\n\nQuestion:\n{message}"
            # response = ask_question(prompt, message)
            if effective_modality == "diagram":
                diagram_prompt = f"""
                {modality_instruction}

                Question:
                {message}

                Context:
                {context[:2000]}
                """

                response = ask_question(diagram_prompt, message)

            else:
                response = ask_question(prompt, message)
            concept = extract_concept(response)

        if effective_modality == "video":
            job_id = str(uuid.uuid4())
            video_jobs[job_id] = {"status": "processing"}
            background_tasks.add_task(generate_video_task, job_id, response, user_id, intent, modality)
            return {
                "type": "video_job",
                "job_id": job_id,
                "script": response,
                "effective_modality": effective_modality,
                "strategy_explanation": {"reason": strategy["reason"], "framework": strategy["framework"]}
            }

        update_context(message, response)
        log_interaction(user_id=user_id, content_id="chat_general", event_type=intent, modality=modality, feedback_granularity=feedbackGranularity)
        return {
            "response": response,
            "effective_modality": effective_modality,
            "concept": concept,
            "strategy_explanation": {"reason": strategy["reason"], "framework": strategy["framework"]}
        }
    except Exception as e:
        return {"response": f"Error: {str(e)}"}