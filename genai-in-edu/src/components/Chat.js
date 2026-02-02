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
import { Howler } from "howler";
import axios from "axios";
import { useContext } from "react";
import { UserContext } from "../context/UserContext";
import { AppContext } from "../App";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import ReplayIcon from "@mui/icons-material/Replay";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import mermaid from "mermaid";




function Chat() {
  const [file, setFile] = useState(null);
  const [inputMessage, setInputMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [pdfContent, setPdfContent] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState(null); // State for file preview
  const [isAgentTyping, setIsAgentTyping] = useState(false);

  const { activeUser } = useContext(UserContext);
  const { preferences } = useContext(AppContext);
  const utteranceRef = useRef(null);
const [isSpeaking, setIsSpeaking] = useState(false);
const [isPaused, setIsPaused] = useState(false);

useEffect(() => {
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
  });
}, []);
useEffect(() => {
  const elements = document.querySelectorAll(".mermaid");

  elements.forEach((el) => {
    if (el.getAttribute("data-processed")) return;

    const graph = el.textContent;
    if (!graph) return;

    const id = `mermaid-${Math.random().toString(36).slice(2)}`;

    mermaid.render(id, graph).then(({ svg }) => {
      el.innerHTML = svg;
      el.setAttribute("data-processed", "true");
    });
  });
}, [chatHistory]);

const splitMermaidFromText = (text) => {
  const mermaidRegex = /(graph\s+(TD|LR|RL|BT|TB|flowchart)[\s\S]*?)(?=\n\n|\n[A-Z]|$)/g;

  const parts = [];
  let lastIndex = 0;

  for (const match of text.matchAll(mermaidRegex)) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }

    parts.push({
      type: "mermaid",
      content: match[0],
    });

    lastIndex = match.index + match[0].length;
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

  const handleMicClick = () => {
    alert("Mic functionality placeholder for Web Speech API integration");
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
      modality: preferences.modalityPreference,
    }, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    // if (response.data.response) {
    //   setChatHistory((prev) => [
    //     ...prev,
    //     { sender: "agent", message: response.data.response },
    //   ]);
    // } 
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
} else if (response.data.response) {
  setChatHistory((prev) => [
    ...prev,
    {
      sender: "agent",
      type: "text",
      message: response.data.response,
    },
  ]);
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
  }
};

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
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

  const cleanTextForSpeech = (text) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // bold
    .replace(/\*(.*?)\*/g, "$1")     // italics
    .replace(/`{1,3}(.*?)`{1,3}/g, "$1") // code
    .replace(/#+\s/g, "")            // headings
    .replace(/\[(.*?)\]\(.*?\)/g, "$1"); // links
};


  const AgentMessage = ({ content, script  }) => {
    const blocks = splitMermaidFromText(content);
    console.log(blocks);


  const { preferences } = useContext(AppContext);

  const utteranceRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Auto-play when modality is audio
  // useEffect(() => {
  // if (preferences.modalityPreference !== "audio") return;

  const startSpeech = (text) => {
  const synth = window.speechSynthesis;

  // kill anything old
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(
    cleanTextForSpeech(text)
  );

  // female voice
  const voices = synth.getVoices();
  utterance.voice =
    voices.find(v => v.name.toLowerCase().includes("female")) ||
    voices.find(v => v.lang.startsWith("en"));

  utterance.onend = () => {
    setIsSpeaking(false);
    setIsPaused(false);
    utteranceRef.current = null;
  };

  utteranceRef.current = utterance;
  synth.speak(utterance);

  setIsSpeaking(true);
  setIsPaused(false);
};

// }, [content, preferences.modalityPreference]);


  const handlePlayPause = (text) => {
  const synth = window.speechSynthesis;

  // Nothing started yet → start
  if (!utteranceRef.current) {
    startSpeech(text);
    return;
  }

  // Currently speaking → pause
  if (synth.speaking && !synth.paused) {
    synth.pause();
    setIsPaused(true);
    return;
  }

  // Paused → resume
  if (synth.paused) {
    synth.resume();
    setIsPaused(false);
  }
};
const handleRepeat = (text) => {
  utteranceRef.current = null;
  startSpeech(text);
};



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
      
      {blocks.map((block, idx) =>
        block.type === "mermaid" ? (
          <div
            key={idx}
            className="mermaid"
            style={{
              backgroundColor: "#1e1e1e",
              padding: "16px",
              borderRadius: "8px",
              margin: "16px 0",
              overflowX: "auto",
            }}
          >
            <ReactMarkdown
            key={idx}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
          >
            {block.content}
            </ReactMarkdown>
          </div>
        ) : (
          // <ReactMarkdown
          //   key={idx}
          //   remarkPlugins={[remarkGfm]}
          //   rehypePlugins={[rehypeRaw]}
          // >
          //   {block.content}
          // </ReactMarkdown>
          <ReactMarkdown
            children={script}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
          />
        )
      )}
      
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
      <ReactMarkdown
        children={content}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{ div }}
      />
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
    ) : (
      <AgentMessage content={msg.message} />
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
          <MicIcon />
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
    </Box>
  </Box>
);
}
export default Chat;