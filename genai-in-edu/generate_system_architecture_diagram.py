import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_architecture():
    fig, ax = plt.subplots(figsize=(14, 10), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Color Palette - Professional Academic Theme
    c_client = "#EBF5FB"  # Soft Blue
    c_client_border = "#2980B9"
    c_cv = "#F5EEF8"      # Soft Purple
    c_cv_border = "#8E44AD"
    c_engine = "#E8F8F5"  # Soft Teal
    c_engine_border = "#16A085"
    c_graph = "#FEF9E7"   # Soft Yellow
    c_graph_border = "#F39C12"
    c_rag = "#FBEEE6"     # Soft Orange
    c_rag_border = "#D35400"

    def add_box(x, y, w, h, title, items, bg_color, border_color, title_color="black"):
        box = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.8", 
                                     facecolor=bg_color, edgecolor=border_color, linewidth=2)
        ax.add_patch(box)
        ax.text(x + w/2, y + h - 2.5, title, fontsize=11, fontweight='bold', ha='center', color=title_color)
        
        # Sub-text items
        item_y = y + h - 6
        for item in items:
            ax.text(x + 2, item_y, f"• {item}", fontsize=8.5, color='#2C3E50', ha='left')
            item_y -= 3.2

    # 1. CLIENT LAYER (Top Left)
    add_box(5, 62, 42, 33, "1. Client Layer (React Dashboard)", [
        "Interactive Inputs: Concept Query, Speech Check Mic",
        "Learner Control: Granularity Slider (0-10), Profile Settings",
        "Telemetry Streaming: 1 Hz Webcam Frames, Click/Scroll Events",
        "Multimodal Renderers: Text, Mermaid.js, Audio (TTS), Video"
    ], c_client, c_client_border, c_client_border)

    # 2. IN-MEMORY CV & TELEMETRY (Top Right)
    add_box(53, 62, 42, 33, "2. Sensing & Telemetry Layer (FastAPI)", [
        "Webcam Frame Ingestion (1 Hz base64 stream)",
        "dlib 68-Landmark Eye Tracking (Binarized I_eye < 70)",
        "Real-Time Focus Score Calculation: S_focus(t)",
        "Privacy-by-Design: Immediate Frame Disposal (In-Memory)"
    ], c_cv, c_cv_border, c_cv_border)

    # 3. MODALITY RESOLUTION & POLICY (Center)
    add_box(29, 36, 42, 21, "3. Modality Resolution Engine (3-Tier Hierarchy)", [
        "Priority 1 (Top Override): Disability Severity Math + Tie-Breaker ε",
        "Priority 2 (Programmatic RL): Neo4j Modality Affinity θ_u(M)",
        "Priority 3 (Fallback): Explicit UI Selection Dropdown"
    ], c_engine, c_engine_border, c_engine_border)

    # 4. KNOWLEDGE GRAPH PERSISTENCE (Bottom Left)
    add_box(5, 3, 42, 28, "4. Persistence Layer (Neo4j Graph DB)", [
        "Nodes: (:User), (:FocusSession), (:Concept), (:ObservedModality)",
        "Edges: -[:HAS_MASTERY]->, -[:USES]->, -[:HAS_FOCUS]->",
        "State Tracking: EMA Mastery Update (S_k = 0.7 S_{k-1} + 0.3 S_quiz)",
        "GDPR Compliance: Cascading Detach-Delete Privacy Operations"
    ], c_graph, c_graph_border, c_graph_border)

    # 5. REASONING & GENERATIVE RAG (Bottom Right)
    add_box(53, 3, 42, 28, "5. Reasoning & Generation Layer (Groq / RAG)", [
        "PyMuPDF Textbook Extraction & FAISS Vector Indexing",
        "Groq Cloud LLM (llama-3.1-8b-instant) Reasoning",
        "Active Recall Verifier: Speech Transcript vs RAG Semantic Align",
        "Multimodal Generators: gTTS Audio, MoviePy + FFmpeg Video"
    ], c_rag, c_rag_border, c_rag_border)

    # ARROWS & CONNECTORS WITH LABELS
    arrow_props = dict(arrowstyle="->", lw=1.8, color="#34495E")
    bi_arrow_props = dict(arrowstyle="<->", lw=1.8, color="#2980B9")

    # Client -> CV (Webcam frames)
    ax.annotate("", xy=(53, 78.5), xytext=(47, 78.5), arrowprops=arrow_props)
    ax.text(50, 80, "1Hz Telemetry", fontsize=8, ha='center', color='#5D6D7E')

    # CV -> Modality Engine (Focus score)
    ax.annotate("", xy=(65, 57), xytext=(65, 62), arrowprops=arrow_props)
    ax.text(66, 59, "S_focus Log", fontsize=8, ha='left', color='#5D6D7E')

    # Modality Engine <-> Neo4j (State query & RL affinity)
    ax.annotate("", xy=(26, 30), xytext=(35, 36), arrowprops=bi_arrow_props)
    ax.text(28, 34, "Query Affinity / Profile", fontsize=8, ha='center', color='#D68910', rotation=32)

    # Modality Engine -> RAG (Modality constraint + Context)
    ax.annotate("", xy=(65, 36), xytext=(58, 36), arrowprops=arrow_props)

    # RAG -> Client (Generated Multimodal Payload)
    ax.annotate("", xy=(26, 62), xytext=(53, 20), arrowprops=arrow_props)
    ax.text(37, 43, "Multimodal Payload\n(Text/Diagram/Audio/Video)", fontsize=8, ha='center', color='#27AE60', rotation=-48)

    # Client -> RAG (Speech Check / Quiz)
    ax.annotate("", xy=(53, 10), xytext=(26, 62), arrowprops=arrow_props)
    ax.text(42, 30, "Speech Verification", fontsize=8, ha='center', color='#C0392B', rotation=62)

    # RAG -> Neo4j (Update Mastery Score S_k)
    ax.annotate("", xy=(47, 17), xytext=(53, 17), arrowprops=arrow_props)
    ax.text(50, 18.5, "Update S_k", fontsize=8, ha='center', color='#884EA0')

    # Main Title
    plt.title("NeuroSync: Closed-Loop State-Sensing ITS Architecture & Operational Workflow", 
              fontsize=13, fontweight='bold', pad=15, color='#1B2631')

    plt.tight_layout()
    plt.savefig('figures/system_architecture.png', format='png', bbox_inches='tight', dpi=300)
    plt.savefig('figures/system_architecture.pdf', format='pdf', bbox_inches='tight', dpi=300)
    print("Saved System Architecture Diagram to figures/system_architecture.png and .pdf")

if __name__ == "__main__":
    draw_architecture()
