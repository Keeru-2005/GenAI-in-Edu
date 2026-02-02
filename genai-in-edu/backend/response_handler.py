import fitz  # PyMuPDF
from groq import Groq

# Initialize Groq client
client = Groq(api_key="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")

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
