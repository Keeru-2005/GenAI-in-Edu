# GenAI Adaptive Educational System

A highly adaptive, AI-driven educational platform designed to curate personalized learning experiences in real-time. By dynamically responding to a student's cognitive state, emotional thresholds, and interaction patterns, the system actively prevents cognitive overload and maintains a high level of engagement.

## 🎯 Problem Statement
Traditional digital education applies a static, "one-size-fits-all" approach. It broadcasts the same information in the same format regardless of a student's fluctuating attention span, frustration levels, or neurological profile. This lack of adaptability leads to cognitive burnout, high attrition rates, and reduced knowledge retention.

## 💡 The Need
Modern learners require an empathetic, closed-loop pedagogical ecosystem. The system must "read the room" by observing physical focus, tracking behavioral impatience, and adapting its tone and teaching modalities in real-time. This ensures that students—whether neurotypical or neurodivergent—are continuously supported in a state of flow.

## 🚀 Novelty & Features
The platform goes beyond passive metrics by utilizing an active behavioral and biometric feedback loop:

* **Real-Time Focus Detection:** Integrates client-side webcam tracking with backend `dlib` facial landmarks to calculate an "Attention Score" (frames looking at the screen vs. total frames), objectively quantifying engagement.
* **Sliding-Window Frustration Detection:** Monitors UI interactions (rapid clicking, erratic scrolling) within a 10-second sliding window. If a frustration threshold is crossed, it interrupts with an empathetic modal to coach emotional regulation.
* **Hierarchical Modality Resolution:** Dynamically shifts between formats (Text, Audio, Video, Interactive Mermaid Diagrams) based on a strict hierarchy: *Declared Disability > System-Inferred Behavioral Affinity > User Preference*.
* **Vocal Concept Evaluation ("Explain What You Know"):** Allows students to speak their answers. The LLM actively parses transcribed audio to pinpoint misconceptions, provide targeted feedback, and update "Concept Mastery."
* **Adaptive Tone & User-Controlled Granularity:** The AI dynamically shifts its pedagogical tone based on self-reported anxiety levels, while users maintain total control over the complexity of explanations via a Feedback Granularity slider (1-10).
* **Transparent Knowledge Graph (Neo4j):** Interconnects Concept Mastery, Focus Sessions, and Impatience Events. The data is visualized on a privacy dashboard, empowering students to see their cognitive patience and focus objectively improve over time.

## 🧠 How It Helps
By shifting from a rigid curriculum to a deeply responsive environment, the system curates a learning experience that honors cognitive diversity:
* **For Neurodivergent Students:** Respects sensory and processing limits by automatically defaulting to optimal modalities (e.g., stripping heavy text for dyslexic users) and providing deep emotional reassurance when anxiety spikes.
* **For All Students:** Maximizes engagement by catching frustration *before* the user gives up. The real-time interventions and granular feedback controls ensure that the content is never too simple to be boring, nor too complex to be overwhelming.

## 🛠️ How to Run Locally

### Prerequisites
* **Node.js** (v14+ recommended)
* **Python** (v3.8+ recommended)
* **Neo4j** Database (Running locally or via AuraDB)

### 1. Start the Backend
Navigate to the backend directory, install dependencies, and start the FastAPI server:
```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```
*(Ensure your `.env` file contains your Neo4j credentials and LLM API keys before starting).*

### 2. Start the Frontend
In a new terminal window, navigate to the project root, install dependencies, and start the React app:
```bash
npm install
npm start
```
The application will be available at `http://localhost:3000`.
