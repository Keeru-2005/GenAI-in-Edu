import fitz  # PyMuPDF
from groq import Groq
import os
import time
import logging
from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)

# Initialize Groq client
GROQ_API = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API) if GROQ_API else None
GROQ_MODEL = os.getenv("GROQ_MODEL", "groq/compound")

FALLBACK_MODELS = [GROQ_MODEL, "groq/compound", "groq/compound-mini", "qwen/qwen3.6-27b"]

def _call_groq_with_fallback(messages, max_tokens=500, temperature=0.6):
    if not client:
        return "Error: Groq client not initialized. Please check GROQ_API_KEY."

    seen_models = set()
    last_error = None

    for model in FALLBACK_MODELS:
        if model in seen_models:
            continue
        seen_models.add(model)

        for attempt in range(2):
            try:
                response = client.chat.completions.create(
                    messages=messages,
                    model=model,
                    max_tokens=max_tokens,
                    temperature=temperature
                )
                content = response.choices[0].message.content.strip()
                if "</think>" in content:
                    content = content.split("</think>")[-1].strip()
                return content
            except Exception as e:
                last_error = e
                err_str = str(e).lower()
                if "429" in err_str or "rate_limit" in err_str:
                    logger.warning(f"Rate limit on model {model}, attempt {attempt+1}. Backing off...")
                    time.sleep(1.5)
                    continue
                else:
                    logger.error(f"Error calling model {model}: {e}")
                    break

    return f"Error: Rate limit reached. Please wait a moment and try again. Details: {last_error}"

# --- PDF Text Extraction ---
def extract_text_from_pdf(file_bytes):
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text

# --- Summarization ---
def summarize_text(text):
    truncated = text[:2500] if text else ""
    messages = [
        {"role": "system", "content": "You are a concise, helpful academic assistant. Provide a structured summary of the key concepts and ideas."},
        {"role": "user", "content": f"Summarize the following text clearly:\n\n{truncated}"}
    ]
    return _call_groq_with_fallback(messages, max_tokens=400)

# --- Question Answering ---
def ask_question(context, question):
    truncated_context = context[:2000] if context else "No context provided."
    messages = [
        {"role": "system", "content": "You are an adaptive, encouraging educational tutor. Provide clear, structured explanations with relevant examples."},
        {"role": "user", "content": f"Context:\n{truncated_context}\n\nQuestion:\n{question}"}
    ]
    return _call_groq_with_fallback(messages, max_tokens=600)

def generate_quiz(context, topic):
    if not client:
        return {"error": "Groq client not initialized."}
    try:
        truncated_context = context[:1500] if context else topic
        prompt = f"""
        Generate 3 multiple choice questions based on this topic.

        Topic: {topic}
        Context: {truncated_context}

        Format STRICTLY as JSON:
        [
          {{
            "question": "...",
            "options": ["A", "B", "C", "D"],
            "answer": "A"
          }}
        ]

        Only output JSON. No explanation.
        """
        messages = [
            {"role": "system", "content": "You are an educational quiz generator. Output ONLY a valid JSON list of 3 questions."},
            {"role": "user", "content": prompt}
        ]
        content = _call_groq_with_fallback(messages, max_tokens=500, temperature=0.3)

        import json
        import re

        # Extract JSON array
        match = re.search(r'\[\s*\{.*\}\s*\]', content, re.DOTALL)
        if match:
            clean_json = match.group(0)
        else:
            clean_json = content
            if "```" in clean_json:
                clean_json = clean_json.split("```")[1]
            clean_json = clean_json.replace("json", "").strip()

        return json.loads(clean_json)

    except Exception as e:
        logger.error(f"Quiz parsing error: {e}")
        return {"error": str(e)}

def explain_mistakes(wrong_concepts):
    prompt = f"""
    A student answered the following questions incorrectly:
    {wrong_concepts}

    For EACH mistake:
    1. Restate the question briefly
    2. Explain WHY the chosen answer was incorrect
    3. Explain the CORRECT concept clearly with an intuitive example
    """
    messages = [
        {"role": "system", "content": "You are an empathetic, clear educational tutor."},
        {"role": "user", "content": prompt}
    ]
    return _call_groq_with_fallback(messages, max_tokens=600)

def extract_concept(text):
    if not text:
        return "general"
    lines = [l.strip() for l in text.split("\n") if l.strip() and not l.strip().startswith("#")]
    if lines:
        words = lines[0].replace("*", "").replace("#", "").replace("`", "").split()
        if len(words) >= 2:
            return " ".join(words[:4])
    return "general"

def classify_intent(message):
    msg = message.lower().strip()
    if any(w in msg for w in ["summarize", "summary", "tldr", "brief", "recap"]):
        return "summarize"
    if any(w in msg for w in ["compare", "difference", "vs", "versus", "distinction"]):
        return "compare"
    if any(w in msg for w in ["analyze", "analysis", "evaluate", "breakdown"]):
        return "analyze"
    if any(w in msg for w in ["explain", "what is", "how does", "why", "tell me about", "describe"]):
        return "explain"
    return "general"