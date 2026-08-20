import os
from groq import Groq
from dotenv import load_dotenv
load_dotenv()

# Initialize Groq client
GROQ_API = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API) if GROQ_API else None
GROQ_MODEL = os.getenv("GROQ_MODEL", "groq/compound")

# In-memory session-level context
conversation_context = {
    "summary": "",
    "topics": [],
}

def update_context(user_message, bot_response):
    global conversation_context

    combined_text = (conversation_context["summary"] + " " + bot_response).strip()
    
    if len(combined_text.split()) > 80 and groq_client:
        try:
            for model in [GROQ_MODEL, "groq/compound-mini", "qwen/qwen3.6-27b"]:
                try:
                    res = groq_client.chat.completions.create(
                        messages=[
                            {
                                "role": "system", 
                                "content": "You are a concise conversation summarizer. Summarize the conversation in 1-2 short sentences and list 3 key topics (comma-separated) on a new line starting with 'Topics:'."
                            },
                            {"role": "user", "content": combined_text[:1000]}
                        ],
                        model=model,
                        max_tokens=100
                    )
                    content = res.choices[0].message.content.strip()
                    if "</think>" in content:
                        content = content.split("</think>")[-1].strip()
                    lines = content.split("\n")
                    conversation_context["summary"] = lines[0]
                    for line in lines[1:]:
                        if "topics:" in line.lower():
                            topics = [t.strip() for t in line.split(":", 1)[1].split(",") if t.strip()]
                            conversation_context["topics"] = list(set(conversation_context["topics"] + topics))
                    break
                except Exception:
                    continue
        except Exception:
            conversation_context["summary"] = combined_text[:300]
    else:
        conversation_context["summary"] = combined_text[:300]

    return conversation_context

def get_context():
    """Return a short context string summarizing the ongoing conversation"""
    ctx = conversation_context["summary"]
    if conversation_context["topics"]:
        ctx += f" | Topics: {', '.join(conversation_context['topics'][:5])}"
    return ctx
