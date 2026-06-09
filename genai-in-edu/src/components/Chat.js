import React, { useState, useRef, useEffect } from "react";
import { useMermaid } from "../utils/useMermaid";
import {
  Box,
  Typography,
  TextareaAutosize,
  IconButton,
  CircularProgress,
  Divider,
  Tooltip,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import MicIcon from "@mui/icons-material/Mic";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Howl, Howler } from "howler";
import axios from "axios";
import { useContext } from "react";
import { UserContext } from "../context/UserContext";
import { AppContext } from "../App";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import ReplayIcon from "@mui/icons-material/Replay";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import mermaid from "mermaid";
import QuizModal from "./modals/QuizModal";
import Button from "@mui/material/Button";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import DownloadIcon from "@mui/icons-material/Download";

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "loose",
  theme: "default",
});
// No mock webgazer needed. Client captures frames and sends to backend for CV processing.

function Chat() {
  const [file, setFile] = useState(null);
  const [inputMessage, setInputMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [pdfContent, setPdfContent] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState(null); // State for file preview
  const [isAgentTyping, setIsAgentTyping] = useState(false);

  const { activeUser } = useContext(UserContext);
  const { preferences, setPreferences, setFocusConsentModalOpen, privacy } = useContext(AppContext);
  const utteranceRef = useRef(null);
const [isSpeaking, setIsSpeaking] = useState(false);
const [isPaused, setIsPaused] = useState(false);
const [isListening, setIsListening] = useState(false);
const [finalTranscript, setFinalTranscript] = useState("");
const [isVoiceMode, setIsVoiceMode] = useState(false);
const [quizData, setQuizData] = useState([]);
const [showQuiz, setShowQuiz] = useState(false);
const voiceRef = useRef(null);
const [currentConcept, setCurrentConcept] = useState("");
const [isExplainMode, setIsExplainMode] = useState(false);
const [lastAgentMessage, setLastAgentMessage] = useState("");
const [isRecordingExplain, setIsRecordingExplain] = useState(false);
const transcriptRef = useRef("");
const [pendingFocusStart, setPendingFocusStart] = useState(false);
useEffect(() => {
  const synth = window.speechSynthesis;

  const setVoice = () => {
    const voices = synth.getVoices();

    // pick ONE voice and LOCK it
    voiceRef.current =
      voices.find(v => v.name.includes("Female")) ||
      voices.find(v => v.lang.startsWith("en")) ||
      voices[0];
  };

  setVoice();

  if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = setVoice;
  }
}, []);


useEffect(() => {
  const handler = (e) => {
    const data = e.detail;

//     const message = `
// Score: ${(data.score * 100).toFixed(0)}%

// ${data.feedback}

// ${data.details.join("\n")}
// `;
    const message = `
    Score: ${(data.score * 100).toFixed(0)}%

    ${data.feedback}

    ${data.details.join("\n")}

    ${data.explanation ? "\n📘 Explanation:\n" + data.explanation : ""}
    `;

    setChatHistory(prev => [
      ...prev,
      { sender: "agent", message }
    ]);
  };

  window.addEventListener("quiz-feedback", handler);

  return () => window.removeEventListener("quiz-feedback", handler);
}, []);

const startExplainRecording = () => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Speech Recognition not supported");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;   // 🔥 KEEP LISTENING
  recognition.interimResults = true;

  transcriptRef.current = "";

  recognition.onresult = (event) => {
    let finalText = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = event.results[i][0].transcript;

      if (event.results[i].isFinal) {
        transcriptRef.current += text + " ";
      } else {
        finalText += text;
      }
    }

    // 👀 live preview in textbox
    setInputMessage(transcriptRef.current + finalText);
  };

  recognition.start();
  recognitionRef.current = recognition;

  setIsRecordingExplain(true);
};
const stopExplainRecording = () => {
  if (recognitionRef.current) {
    recognitionRef.current.stop();
  }

  setIsRecordingExplain(false);

  const finalTranscript = transcriptRef.current.trim();

  if (finalTranscript) {
    sendExplain(finalTranscript);
    setInputMessage(""); // clear box
  }
};
const cleanTextForSpeech = (text) => {
  return text
    ? text
        .replace(/```[\s\S]*?```/g, "") // remove multiline code blocks completely (like mermaid)
        .replace(/\*\*(.*?)\*\*/g, "$1") // bold
        .replace(/\*(.*?)\*/g, "$1")     // italics
        .replace(/`(.*?)`/g, "$1")       // inline code
        .replace(/#+\s/g, "")            // headings
        .replace(/\[(.*?)\]\(.*?\)/g, "$1") // links
    : "";
};
const howlRef = useRef(null);

const startSpeech = async (text) => {
  try {
    setIsSpeaking(true);
    setIsPaused(false);
    
    const formData = new FormData();
    formData.append("text", cleanTextForSpeech(text));
    
    const res = await axios.post("http://localhost:8000/generate-audio", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    
    if (res.data.audio_url) {
      if (howlRef.current) {
        howlRef.current.unload();
      }
      
      howlRef.current = new Howl({
        src: [res.data.audio_url],
        html5: true,
        onend: () => {
          setIsSpeaking(false);
          setIsPaused(false);
        }
      });
      howlRef.current.play();
    }
  } catch (e) {
    console.error("Audio generation failed:", e);
    setIsSpeaking(false);
  }
};

const handlePlayPause = (text) => {
  if (!howlRef.current) {
    startSpeech(text);
    return;
  }
  
  if (howlRef.current.playing()) {
    howlRef.current.pause();
    setIsPaused(true);
  } else {
    howlRef.current.play();
    setIsPaused(false);
  }
};

const handleRepeat = (text) => {
  if (howlRef.current) {
    howlRef.current.stop();
  }
  startSpeech(text);
};

const splitMermaidFromText = (text) => {
  const regex = /```mermaid\s*([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }

    parts.push({
      type: "mermaid",
      content: match[1].trim(), // RAW mermaid code
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  return parts;
};



const mermaidRef = useRef(null);

const chatContainerRef = useRef(null);
  

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isAgentTyping]);

  const recognitionRef = useRef(null);

  const startSpeechRecognition = (onResult) => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Speech Recognition not supported");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };

  recognition.onerror = (event) => {
    console.error("Speech error:", event.error);
  };

  recognition.start();
};
  const sendExplain = async (spokenText) => {

  // show what user said
  setChatHistory(prev => [
    ...prev,
    { sender: "user", message: spokenText }
  ]);

  const res = await axios.post(
    "http://localhost:8000/evaluate-understanding",
    {
      user_id: activeUser.user_id,
      concept: currentConcept,
      original_explanation: lastAgentMessage,
      user_explanation: spokenText
    }
  );

  setChatHistory(prev => [
    ...prev,
    {
      sender: "agent",
      message: res.data.evaluation
    }
  ]);
};
const handleMicClick = () => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Speech recognition not supported");
    return;
  }
  startSpeechRecognition((transcript) => {
    if (isExplainMode) {
      sendExplain(transcript);
      setIsExplainMode(false);
    } else {
      setInputMessage(transcript);
    }
  });

  // 🔴 STOP recording
  if (isListening && recognitionRef.current) {
    recognitionRef.current.stop();
    setIsListening(false);
    console.log("🛑 Recording stopped");
    return;
  }
  setIsVoiceMode(true);
  // 🟢 START recording
  const recognition = new SpeechRecognition();

  recognition.lang = "en-US";
  recognition.continuous = true;        // ✅ keep listening
  recognition.interimResults = true;    // ✅ live typing

  let localFinalTranscript = finalTranscript;

  recognition.onstart = () => {
    console.log("🎤 Recording started...");
    setIsListening(true);
  };

  recognition.onresult = (event) => {
    let interimTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcriptChunk = event.results[i][0].transcript;

      if (event.results[i].isFinal) {
        localFinalTranscript += transcriptChunk + " ";
      } else {
        interimTranscript += transcriptChunk;
      }
    }

    const combined = localFinalTranscript + interimTranscript;

    // 🔥 LIVE update textbox
    setInputMessage(combined);
    setFinalTranscript(localFinalTranscript);

    console.log("🗣 Live:", combined);
  };

  recognition.onerror = (event) => {
    console.error("❌ Speech error:", event.error);
    setIsListening(false);
  };

  recognition.onend = () => {
    console.log("🛑 Recognition ended");
    setIsListening(false);
  };

  recognition.start();
  recognitionRef.current = recognition;
};

  const handleUpload = async (selectedFile) => {
  if (!selectedFile) return;
  setIsAgentTyping(true);
  const formData = new FormData();
  formData.append("file", selectedFile);
  formData.append("user_id", activeUser.user_id);


  try {
    const response = await axios.post("http://localhost:8000/upload-pdf", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (response.data.text) {
      setPdfContent(response.data.text);
      setUploadedFileName(selectedFile.name);
      setChatHistory([...chatHistory, { sender: "agent", message: "PDF uploaded successfully. Ask me anything about it!" }]);
    } else {
      setChatHistory([...chatHistory, { sender: "agent", message: "No text extracted from PDF." }]);
    }
  } catch (error) {
    console.error("Upload error:", error);
    setChatHistory([...chatHistory, { sender: "agent", message: `Error uploading PDF: ${error.message}` }]);
  } finally {
    setIsAgentTyping(false);
  }
};

  const handleSend = async () => {
    if (!inputMessage.trim()) return;
    setIsAgentTyping(true);

    // Add user message to chat history immediately
    setChatHistory((prev) => [
      ...prev,
      { sender: "user", message: inputMessage },
    ]);

    try {
      const response = await axios.post("http://localhost:8000/process-message", {
        message: inputMessage,
        pdfContent: pdfContent || "",
        user_id: activeUser.user_id,
        modality: isVoiceMode ? "audio" : preferences.modalityPreference,
        feedbackGranularity: preferences.feedbackGranularity,
      }, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      if (response.data.response) {
      setLastAgentMessage(response.data.response);
    }
      if (response.data.concept){
        console.log("Extracted concept:", response.data.concept);
        setCurrentConcept(response.data.concept);
      }
      // 🎓 Apply backend-decided teaching modality (silent override)
      if (response.data.effective_modality) {
        // const inferred = response.data.effective_modality;
        const inferred = isVoiceMode ? "audio" : response.data.effective_modality;

        console.log(
          "🎓 Teaching Strategy Applied:",
          inferred,
          "|",
          response.data.strategy_explanation
        );

        // 🔄 Subtly update radio buttons (no UI explanation)
        setPreferences(prev => ({
          ...prev,
          modalityPreference: inferred,
        }));
      }

      if (response.data.type === "video") {
    setChatHistory((prev) => [
      ...prev,
      {
        sender: "agent",
        type: "video",
        video_url: response.data.video_url,
        script: response.data.script,
      },
    ]);
  } else if (response.data.type === "video_job") {
    const jobId = response.data.job_id;
    const tempId = Date.now();
    
    setChatHistory((prev) => [
      ...prev,
      {
        id: tempId,
        sender: "agent",
        type: "video_loading",
        message: "Generating your video...",
      },
    ]);

    const pollInterval = setInterval(async () => {
      try {
        const statusRes = await axios.get(`http://localhost:8000/video-status/${jobId}`);
        if (statusRes.data.status === "completed") {
          clearInterval(pollInterval);
          setChatHistory((prev) => prev.map(msg => 
            msg.id === tempId ? {
              sender: "agent",
              type: "video",
              video_url: statusRes.data.video_url,
              script: statusRes.data.script
            } : msg
          ));
        } else if (statusRes.data.status === "failed") {
          clearInterval(pollInterval);
          setChatHistory((prev) => prev.map(msg => 
            msg.id === tempId ? {
              sender: "agent",
              type: "text",
              message: "Video generation failed."
            } : msg
          ));
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 3000);
  } else if (response.data.response) {
    setChatHistory((prev) => [
      ...prev,
      {
        sender: "agent",
        type: "text",
        message: response.data.response,
      },
    ]);
      // 🎯 QUIZ GENERATION (ADD THIS RIGHT AFTER AGENT RESPONSE)
    try {
      const quizRes = await axios.post(
        "http://localhost:8000/generate-quiz",
        {
          user_id: activeUser.user_id,
          topic: inputMessage,
          context: response.data.response || "",
        }
      );

      console.log("🧠 Quiz generated:", quizRes.data.quiz);

      // if (Array.isArray(quizRes.data.quiz)) {
      //   setQuizData(quizRes.data.quiz);
      //   setShowQuiz(true);
      // } else {
      //   console.error("Invalid quiz format:", quizRes.data.quiz);
      // }
      // console.log("QUIZ DATA:", quizRes.data);
      // setShowQuiz(true);

    } catch (err) {
      console.error("Quiz generation failed:", err);
    }
  }

      else {
        setChatHistory((prev) => [
          ...prev,
          { sender: "agent", message: "No response from agent." },
        ]);
      }
    } catch (error) {
      console.error("Send error:", error);
      setChatHistory((prev) => [
        ...prev,
        { sender: "agent", message: `Error: ${error.message}` },
      ]);
    } finally {
      setInputMessage("");
      setIsAgentTyping(false);
      setFinalTranscript("");
      setIsVoiceMode(false);
    }
  };
const videoRef = useRef(null);
const canvasRef = useRef(null);
const focusIntervalRef = useRef(null);
const focusDataRef = useRef({ attended: 0, total: 0 });

const startFocus = async () => {
  if (!privacy.eyeTrackingConsent) {
    setPendingFocusStart(true);
    setFocusConsentModalOpen(true);
    return;
  }

  await axios.post("http://localhost:8000/start-focus-session", {
    user_id: activeUser.user_id
  }, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.style.display = "block";
        videoRef.current.style.position = "fixed";
        videoRef.current.style.top = "10px";
        videoRef.current.style.right = "10px";
        videoRef.current.style.width = "200px";
        videoRef.current.style.borderRadius = "8px";
        videoRef.current.style.zIndex = "9999";
        videoRef.current.style.transform = "scaleX(-1)";
    }
    
    // start sending frames
    focusIntervalRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.5); // lower quality to reduce payload size
        
        axios.post("http://localhost:8000/process-frame", {
            user_id: activeUser.user_id,
            image_base64: dataUrl
        });
    }, 1000); // 1 frame per second
    
    alert("👀 Focus session started with real eye tracking");
  } catch (e) {
    alert("Failed to access webcam");
  }
};

const stopFocus = async () => {
  if (focusIntervalRef.current) {
      clearInterval(focusIntervalRef.current);
      focusIntervalRef.current = null;
  }

  // Force stop all tracks to ensure webcam light turns off
  if (videoRef.current && videoRef.current.srcObject) {
    videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    videoRef.current.srcObject = null;
    videoRef.current.style.display = "none";
  }

  const res = await axios.post("http://localhost:8000/stop-focus-session", {
    user_id: activeUser.user_id
  }, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });

  alert(`🧠 Attention Score: ${res.data.attention_score.toFixed(2)}%`);
};

useEffect(() => {
  if (pendingFocusStart && privacy.eyeTrackingConsent) {
    setPendingFocusStart(false);
    startFocus();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [privacy.eyeTrackingConsent, pendingFocusStart]);

  const sendVoiceMessage = async (voiceText) => {
    if (!voiceText.trim()) return;

    setIsAgentTyping(true);

    setChatHistory((prev) => [
      ...prev,
      { sender: "user", message: voiceText },
    ]);

    try {
      const response = await axios.post(
        "http://localhost:8000/process-message",
        {
          message: voiceText,
          pdfContent: pdfContent || "",
          user_id: activeUser.user_id,
          modality: "audio", // voice conversations default to audio
          feedbackGranularity: preferences.feedbackGranularity,
        },
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      const answer =
        response.data.response ||
        response.data.script ||
        "No response received.";

      setChatHistory((prev) => [
        ...prev,
        {
          sender: "agent",
          type: "text",
          message: answer,
        },
      ]);

      // 🔊 auto speak response
      startSpeech(answer);

    } catch (error) {
      console.error("Voice send error:", error);
    } finally {
      setIsAgentTyping(false);
    }
  };


  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };
  const handleUnderstood = async (content) => {
  try {
    const quizRes = await axios.post(
      "http://localhost:8000/generate-quiz",
      {
        user_id: activeUser.user_id,
        topic: inputMessage,
        context: content,
      }
    );

    if (Array.isArray(quizRes.data.quiz)) {
      setQuizData(quizRes.data.quiz);
      setShowQuiz(true);
    }
  } catch (err) {
    console.error("Quiz error:", err);
  }
};
const handleNotUnderstood = async (content) => {
  try {
    const res = await axios.post(
      "http://localhost:8000/process-message",
      {
        message: "Explain the concepts in the following content in a much simpler way. If there are multiple concepts, break down each one separately. Use simple language and examples.\n\n" + content,
        pdfContent: content,
        user_id: activeUser.user_id,
        modality: preferences.modalityPreference,
      },
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    setChatHistory(prev => [
      ...prev,
      {
        sender: "agent",
        type: "text",
        message: res.data.response,
      }
    ]);
  } catch (err) {
    console.error("Simplify error:", err);
  }
};

  const div = ({ node, ...props }) => {
    if (props.className === "mermaid") {
      return (
        <div
          ref={mermaidRef}
          {...props}
          aria-label="Mermaid diagram"
          style={{ overflowX: "auto" }}
        />
      );
    }
    return <div {...props} />;
  };

  const UserMessage = ({ content }) => (
    <Box
      sx={{
        bgcolor: "primary.main",
        color: "primary.contrastText",
        borderRadius: "16px 16px 0 16px",
        px: 2,
        py: 1.25,
        maxWidth: "70%",
        wordBreak: "break-word",
        alignSelf: "flex-end",
        mb: 1,
      }}
      aria-label="User message"
    >
      <Typography variant="body1">{content}</Typography>
    </Box>
  );

  // const AgentMessage = ({ content }) => (
  //   <Box
  //     sx={{
  //       bgcolor: "grey.800",
  //       color: "grey.200",
  //       borderRadius: "16px 16px 16px 0",
  //       px: 2,
  //       py: 1.25,
  //       maxWidth: "70%",
  //       wordBreak: "break-word",
  //       alignSelf: "flex-start",
  //       mb: 1,
  //     }}
  //     aria-label="Agent message"
  //   >
  //     <ReactMarkdown
  //       children={content}
  //       remarkPlugins={[remarkGfm]}
  //       rehypePlugins={[rehypeRaw]}
  //       components={{ div }}
        
  //     />
  //   </Box>
  // );
const openFullscreen = (element) => {
  if (!element) return;

  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen();
  }
};
const downloadDiagram = (container, filename = "diagram") => {
  const svg = container.querySelector("svg");

  if (!svg) {
    alert("No diagram found");
    return;
  }

  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svg);

  const svgBlob = new Blob([source], {
    type: "image/svg+xml;charset=utf-8",
  });

  const url = URL.createObjectURL(svgBlob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.svg`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};
  const AgentMessage = ({ content, script, onUnderstood, onNotUnderstood }) => {
    const blocks = splitMermaidFromText(content);
    console.log(blocks);


  const { preferences } = useContext(AppContext);


  return (
    <Box
      sx={{
        bgcolor: "grey.800",
        color: "grey.200",
        borderRadius: "16px 16px 16px 0",
        px: 2,
        py: 1.25,
        maxWidth: "70%",
        wordBreak: "break-word",
        alignSelf: "flex-start",
        mb: 1,
      }}
      aria-label="Agent message"
    >
      
      {blocks.map((block, idx) => {
  const uniqueKey = `${idx}-${block.content.slice(0, 20)}`;

  return block.type === "mermaid" ? (
          // <div
          //   key={idx}
          //   ref={(el) => {
          //     if (el && !el.getAttribute("data-processed")) {
          //       el.innerHTML = block.content;

          //       mermaid
          //         .run({
          //           nodes: [el],
          //         })
          //         .then(() => {
          //           el.setAttribute("data-processed", "true");
          //         })
          //         .catch((err) => console.error("Mermaid error:", err));
          //     }
          //   }}
          //   style={{
          //     backgroundColor: "#f4f4f4",
          //     padding: "16px",
          //     borderRadius: "8px",
          //     margin: "16px 0",
          //     overflowX: "auto",
          //   }}
          // />
          <Box
            key={uniqueKey}
            sx={{
              position: "relative",
              margin: "16px 0",
            }}
          >
            {/* ACTION BUTTONS */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
                mb: 1,
              }}
            >
              <IconButton
                size="small"
                onClick={(e) => {
                  const container =
                    e.currentTarget.parentElement.nextSibling;
                  openFullscreen(container);
                }}
              >
                <FullscreenIcon />
              </IconButton>

              <IconButton
                size="small"
                onClick={(e) => {
                  const container =
                    e.currentTarget.parentElement.nextSibling;
                  downloadDiagram(container, `diagram-${uniqueKey}`);
                }}
              >
                <DownloadIcon />
              </IconButton>
            </Box>

            {/* DIAGRAM */}
            <div
              ref={(el) => {
                if (el && !el.getAttribute("data-processed")) {
                  el.removeAttribute("data-processed");
                  el.innerHTML = "";
                  el.innerHTML = block.content;

                  mermaid
                    .run({
                      nodes: [el],
                    })
                    .then(() => {
                      el.setAttribute("data-processed", "true");
                    })
                    .catch((err) =>
                      console.error("Mermaid error:", err)
                    );
                }
              }}
              style={{
                backgroundColor: "#ededed",
                padding: "16px",
                borderRadius: "8px",
                overflowX: "auto",
              }}
            />
          </Box>
        ) : (
          // <ReactMarkdown
          //   key={idx}
          //   remarkPlugins={[remarkGfm]}
          //   rehypePlugins={[rehypeRaw]}
          // >
          //   {block.content}
          // </ReactMarkdown>
          <ReactMarkdown
            key={uniqueKey}

            children={block.content}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
          />
        )
      })}
      {/* 🔊 Audio controls (only if audio mode) */}
      {preferences.modalityPreference === "audio" && (
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <IconButton size="small" onClick={() => handlePlayPause(content)}>
            {isPaused || !isSpeaking ? <PlayArrowIcon /> : <PauseIcon />}
          </IconButton>

          <IconButton size="small" onClick={() => handleRepeat(content)}>
          <ReplayIcon />
        </IconButton>

          <Tooltip title={content} sx={{px: 2, py: 1.25}}>
            <IconButton size="small">
              <InfoOutlinedIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}
      


      {/* 📝 Always show text (accessibility + fallback) */}
      {/* <ReactMarkdown
        children={content}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{ div }}
      /> */}
      <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
        <IconButton
          variant="contained"
          size="small"
          onClick={() => onUnderstood(content)}
        >
          ✓ Understood
        </IconButton>

        <IconButton
          variant="outlined"
          size="small"
          onClick={() => onNotUnderstood(content)}
        >
          ✗ Not understood
        </IconButton>
        <Button
          variant="contained"
          color={isRecordingExplain ? "error" : "primary"}
          onClick={() => {
            if (!isRecordingExplain) {
              startExplainRecording();
            } else {
              stopExplainRecording();
            }
          }}
        >
          {isRecordingExplain ? "⏹ Stop Recording" : "🎤 Explain what you know"}
        </Button>
      </Box>
    </Box>
  );
};
// Add this new component inside Chat.js, after AgentMessage component

const VideoMessage = ({ video_url, script }) => {
  const [showScript, setShowScript] = useState(false);

  return (
    <Box
      sx={{
        bgcolor: "grey.800",
        color: "grey.200",
        borderRadius: "16px 16px 16px 0",
        px: 2,
        py: 1.25,
        maxWidth: "80%",
        wordBreak: "break-word",
        alignSelf: "flex-start",
        mb: 1,
      }}
      aria-label="Video message"
    >
      <Typography variant="body2" sx={{ mb: 1, color: "grey.400" }}>
        🎬 Video Generated
      </Typography>

      {/* Video Player */}
      <video
        controls
        onPlay={() =>
          axios.post("http://localhost:8000/log-modality-event", {
            user_id: activeUser.user_id,
            modality: "video",
            event: "play",
            duration: 0,
          })
        }
        style={{
          width: "100%",
          maxHeight: "400px",
          borderRadius: "8px",
        }}
        aria-label="Generated educational video"
      >
        <source src={video_url} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Script Toggle */}
      <Box sx={{ mt: 2 }}>
        <IconButton
          size="small"
          onClick={() => setShowScript(!showScript)}
          sx={{ color: "primary.main" }}
        >
          <InfoOutlinedIcon />
        </IconButton>
        <Typography
          variant="caption"
          sx={{ ml: 1, cursor: "pointer" }}
          onClick={() => setShowScript(!showScript)}
        >
          {showScript ? "Hide" : "Show"} Script
        </Typography>
      </Box>

      {/* Collapsible Script */}
      {showScript && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            bgcolor: "grey.900",
            borderRadius: "8px",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          <ReactMarkdown
            children={script}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
          />
        </Box>
      )}
    </Box>
  );
};

  return (
  <Box
    sx={{
      flexGrow: 1,
      display: "flex",
      flexDirection: "column",
      p: 2,
      pt: 10,
      pb: 0,
    }}
    role="main"
    aria-label="Chat window main content"
  >
    <Box
      sx={{
        flexGrow: 1,
        maxHeight: "80vh", // Fixed height constraint for scrolling
        overflowY: "auto", // Ensures scrolling
        display: "flex",
        flexDirection: "column",
        mb: 1,
        pb: 1,
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.paper",
        minHeight: 0,
      }}
      tabIndex={0}
      aria-live="polite"
      aria-relevant="additions"
      aria-atomic="false"
    >
      <IconButton onClick={startFocus}>Start Session</IconButton>
      <IconButton onClick={stopFocus}>Stop Session</IconButton>
      {chatHistory.length === 0 && (
        <Typography
          variant="body1"
          sx={{ p: 2, color: "text.secondary", alignSelf: "center" }}
        >
          Start the conversation by typing your query below.
        </Typography>
      )}
      {/* // Update the chat history rendering section: */}
{chatHistory.map((msg, index) => (
  <React.Fragment key={index}>
    {msg.sender === "user" ? (
      <UserMessage content={msg.message} />
    ) : msg.type === "video" ? (
      <VideoMessage video_url={msg.video_url} script={msg.script} />
    ) : msg.type === "video_loading" ? (
      <Box sx={{ alignSelf: "flex-start", px: 2, py: 1, mb: 1, display: "flex", alignItems: "center" }}>
        <CircularProgress size={16} sx={{ mr: 1 }} />
        <Typography variant="body2">{msg.message}</Typography>
      </Box>
    ) : (
      <AgentMessage content={msg.message} onUnderstood={handleUnderstood} onNotUnderstood={handleNotUnderstood}/>
    )}
  </React.Fragment>
))}
      {isAgentTyping && (
        <Box
          sx={{
            alignSelf: "flex-start",
            px: 2,
            py: 1,
            mb: 1,
            display: "flex",
            alignItems: "center",
            color: "text.secondary",
          }}
          aria-live="assertive"
        >
          <CircularProgress size={16} sx={{ mr: 1 }} aria-hidden="true" />
          <Typography variant="caption" aria-label="Agent is typing">
            Agent is typing...
          </Typography>
        </Box>
      )}
      <div ref={messagesEndRef} />
      <video ref={videoRef} style={{ display: "none" }} autoPlay playsInline muted />
      <canvas ref={canvasRef} width={320} height={240} style={{ display: "none" }} />
    </Box>

    <Divider />

    <Box
      sx={{ display: "flex", alignItems: "center", pt: 1, pb: 1, bgcolor: "background.paper" }}
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        handleSend();
      }}
      aria-label="Message input form"
    >
      <Tooltip title="Attach PDF (study material)">
        <label htmlFor="pdf-upload">
          <IconButton component="span">
            <AttachFileIcon />
          </IconButton>
        </label>
      </Tooltip>
      <input
        type="file"
        accept=".pdf"
        style={{ display: "none" }}
        id="pdf-upload"
        onChange={(e) => {
          const selectedFile = e.target.files[0];
          if (selectedFile) {
            console.log("File selected:", selectedFile.name);
            handleUpload(selectedFile);
          }
        }}
      />

      <TextareaAutosize
        minRows={1}
        maxRows={4}
        aria-label="Chat message input"
        placeholder="Type your message..."
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          resize: "none",
          width: "100%",
          fontSize: 16,
          padding: 8,
          borderRadius: 4,
          borderColor: "#ccc",
          fontFamily: "Roboto, sans-serif",
          backgroundColor: "transparent",
          color: "inherit",
        }}
      />

      <Tooltip title="Use microphone for speech-to-text (placeholder)">
        <IconButton
          aria-label="Mic for speech to text"
          onClick={(e) => {
            e.preventDefault();
            handleMicClick();
          }}
          size="large"
          sx={{ ml: 1 }}
        >
          <MicIcon color={isListening? "error":"inherit"}/>
        </IconButton>
      </Tooltip>

      <Tooltip title="Send message">
        <IconButton
          aria-label="Send message"
          type="submit"
          size="large"
          sx={{ ml: 1 }}
        >
          <SendIcon />
        </IconButton>
      </Tooltip>
      <QuizModal
        open={showQuiz}
        onClose={() => setShowQuiz(false)}
        quizData={quizData}
        user_id={activeUser.user_id}
        topic={currentConcept}
      />
    </Box>
  </Box>
);
}
export default Chat;