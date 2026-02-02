from transformers import pipeline

# Load summarization and NER models (can be cached globally)
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
ner = pipeline("ner", grouped_entities=True, model="dslim/bert-base-NER")

# In-memory session-level context
conversation_context = {
    "summary": "",
    "topics": [],
}

def update_context(user_message, bot_response):
    global conversation_context

    # Step 1: Extract key entities/topics
    entities = ner(bot_response)
    new_topics = [e['word'] for e in entities if e['entity_group'] in ['ORG', 'MISC', 'PER', 'LOC']]

    # Step 2: Generate or refine conversation summary
    combined_text = (conversation_context["summary"] + " " + bot_response).strip()
    if len(combined_text.split()) > 80:  # Summarize if it's getting too long
        summary = summarizer(combined_text, max_length=60, min_length=30, do_sample=False)[0]['summary_text']
    else:
        summary = combined_text

    # Step 3: Update context
    conversation_context["summary"] = summary
    conversation_context["topics"] = list(set(conversation_context["topics"] + new_topics))

    return conversation_context

def get_context():
    """Return a short context string summarizing the ongoing conversation"""
    ctx = conversation_context["summary"]
    if conversation_context["topics"]:
        ctx += f" | Topics: {', '.join(conversation_context['topics'][:5])}"
    return ctx
