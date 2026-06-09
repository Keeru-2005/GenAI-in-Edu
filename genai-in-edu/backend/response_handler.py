import fitz  # PyMuPDF
from groq import Groq
import os

# Initialize Groq client
GROQ_API = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API)

# --- PDF Text Extraction ---
def extract_text_from_pdf(file_bytes):
    # Open PDF directly from bytes
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text
# --- Summarization ---
def summarize_text(text):
    try:
        summary_response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": f"Summarize the following text: {text}"}
            ],
            model="llama-3.1-8b-instant",
        )
        return summary_response.choices[0].message.content
    except Exception as e:
        return f"Error during summarization: {e}"

# --- Question Answering ---
def ask_question(context, question):
    try:
        answer_response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": f"Context: {context}\n\nQuestion: {question}"}
            ],
            model="llama-3.1-8b-instant",
        )
        return answer_response.choices[0].message.content
    except Exception as e:
        return f"Error during Q&A: {e}"


def generate_quiz(context, topic):
    try:
        prompt = f"""
        Generate 3 multiple choice questions based on this topic.

        Topic: {topic}

        Context:
        {context}

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
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a quiz generator."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant",
        )

        import json
        import re
        content = response.choices[0].message.content.strip()

        # Robust JSON parsing using regex
        match = re.search(r'\[.*\]', content, re.DOTALL)
        if match:
            content = match.group(0)
        else:
            if "```" in content:
                content = content.split("```")[1]
            content = content.replace("json", "").strip()

        return json.loads(content)

    except Exception as e:
        return {"error": str(e)}
def explain_mistakes(wrong_concepts):
    try:
        prompt = f"""
            A student answered the following questions incorrectly.

            For EACH mistake:
            1. First restate the QUESTION
            2. Then explain WHY the student's answer is wrong
            3. Then explain the CORRECT answer clearly in context of the question

            Mistakes:
            {wrong_concepts}

            IMPORTANT:
            - Stay strictly tied to the question
            - Do NOT give generic explanations
            - Be specific and clear
            - Keep it simple

            Format:
            Q1:
            Question: ...\n
            Your Answer: ...\n
            Correct Answer: ...\n
            Explanation: ...\n
            """

        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a helpful teacher."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant",
        )

        return response.choices[0].message.content

    except Exception as e:
        return "Could not generate explanation."
def extract_concept(text):
    try:
        prompt = f"""
        Extract the main learning concept from this text.

        Return ONLY 1–3 words.
        No sentence. No explanation.

        Text:
        {text}
        """

        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You extract key concepts."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant",
        )
        
        return response.choices[0].message.content.strip()

    except:
        return "general"

def classify_intent(message):
    try:
        prompt = f"""
        Classify the intent of the following user message into ONE of these categories:
        summarize, explain, compare, analyze, general.

        Message: {message}
        
        Return ONLY the single word category name in lowercase.
        """
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You classify user intents."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant",
        )
        intent = response.choices[0].message.content.strip().lower()
        valid_intents = ["summarize", "explain", "compare", "analyze", "general"]
        return intent if intent in valid_intents else "general"
    except Exception as e:
        return "general"