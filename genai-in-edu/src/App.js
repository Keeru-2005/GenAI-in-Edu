// File: src/App.js
import React, { useMemo, useState, useEffect, createContext, useContext } from "react";
import {
  CssBaseline,
  Box,
  createTheme,
  ThemeProvider,
  useMediaQuery,
} from "@mui/material";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";

// Layout & Components
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Chat from "./components/Chat";
import Settings from "./components/Settings";
import QuizModal from "./components/modals/QuizModal";
import FeedbackModal from "./components/modals/FeedbackModal";
import FocusConsentModal from "./components/modals/FocusConsentModal";
import EmotionalSupportPopup from "./components/EmotionalSupportPopup";
import ImpatienceModal from "./components/modals/ImpatienceModal";
import { UserContext } from "./context/UserContext";
// Contexts
export const ColorModeContext = createContext({ toggleColorMode: () => { } });
export const AppContext = createContext();


function App() {
  const { activeUser } = useContext(UserContext);
  // Dark/light mode management w/ system preference fallback
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const [mode, setMode] = React.useState(prefersDarkMode ? "dark" : "light");
  const colorMode = React.useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
      },
      mode,
    }),
    [mode]
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: "#6366f1", // vibrant indigo
          },
          secondary: {
            main: "#ec4899", // pink accent
          },
          background: {
            default: mode === "light" ? "#f8fafc" : "#0f172a",
            paper: mode === "light" ? "#ffffff" : "#1e293b",
          },
        },
        typography: {
          fontFamily: '"Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                borderRadius: 8,
              },
            },
          },
        },
      }),
    [mode]
  );

  // App-wide states
  // Chat messages: {id, sender: "user"|"agent", content, type: "text"|"quiz"|"audio"|"video"|"diagram", timestamp}
  // Simplified for demo, real IDs should be UUID or backend-generated
  const [chatMessages, setChatMessages] = useState([]);

  // Typing indicator state for agent
  const [isAgentTyping, setIsAgentTyping] = useState(false);

  // Sidebar user preferences state
  const [preferences, setPreferences] = useState({
    feedbackGranularity: 5,
    anxietyLevel: 3,
    modalityPreference: "text", // text|audio|video|diagram
  });

  // Disability support form values
  const [disabilities, setDisabilities] = useState({
    ADHD: "none", // none, mild, moderate, severe
    Autism: "none",
    Dyslexia: "none",
    consent: false,
  });

  // Privacy consents & toggles
  const [privacy, setPrivacy] = useState({
    eyeTrackingConsent: false,
  });

  // Learner model data placeholder (normally fetched from API)
  const [learnerModel, setLearnerModel] = useState({
    habits: "Consistent morning learner",
    focusLevel: "High",
    progress: "70%",
  });

  // Modals states
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [focusConsentModalOpen, setFocusConsentModalOpen] = useState(false);

  // Emotional Support Popup Show/hide
  const [showEmotionalSupport, setShowEmotionalSupport] = useState(false);
  
  // Impatience Modal Show/hide
  const [impatienceModalOpen, setImpatienceModalOpen] = useState(false);

  // Simulate agent typing and streaming response (placeholder)
  useEffect(() => {
    if (chatMessages.length > 0) {
      const lastMessage = chatMessages[chatMessages.length - 1];
      if (lastMessage.sender === "user") {
        setIsAgentTyping(true);
        // Simulate delay
        const timer = setTimeout(() => {
          setChatMessages((msgs) => [
            ...msgs,
            {
              id: msgs.length + 1,
              sender: "agent",
              type: "text",
              content:
                "Thanks for your question! Here's an explanation tailored to your preferences.",
              timestamp: Date.now(),
            },
          ]);
          setIsAgentTyping(false);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [chatMessages]);

  // Monitor anxiety level to show emotional support popup
  useEffect(() => {
    if (preferences.anxietyLevel >= 7) {
      setShowEmotionalSupport(true);
    } else {
      setShowEmotionalSupport(false);
    }
  }, [preferences.anxietyLevel]);

  // Impatience Detection (Sliding Window)
  useEffect(() => {
    let clickQueue = [];
    let scrollQueue = [];
    let lastScrollY = window.scrollY;

    const handleClick = () => {
      const now = Date.now();
      clickQueue.push(now);
      checkThresholds(now);
    };

    const handleScroll = () => {
      const now = Date.now();
      const currentScrollY = window.scrollY;
      const delta = Math.abs(currentScrollY - lastScrollY);
      lastScrollY = currentScrollY;
      
      if (delta > 0) {
        scrollQueue.push({ time: now, delta });
        checkThresholds(now);
      }
    };

    const checkThresholds = (now) => {
      // 10-second sliding window
      const windowStart = now - 10000;
      
      // Clean up old events
      clickQueue = clickQueue.filter(t => t >= windowStart);
      scrollQueue = scrollQueue.filter(ev => ev.time >= windowStart);

      // Check click threshold (15 clicks in 10s)
      if (clickQueue.length > 15) {
        triggerImpatience("clicks");
        clickQueue = []; // reset after trigger
        scrollQueue = [];
      }

      // Check scroll threshold (5000px in 10s)
      const totalScroll = scrollQueue.reduce((acc, curr) => acc + curr.delta, 0);
      if (totalScroll > 5000) {
        triggerImpatience("scrolls");
        clickQueue = []; // reset after trigger
        scrollQueue = [];
      }
    };

    const triggerImpatience = (trigger_type) => {
      if (!activeUser?.user_id) return;
      setImpatienceModalOpen(true);
      
      axios.post("http://localhost:8000/log-impatience-event", {
        user_id: activeUser.user_id,
        trigger_type: trigger_type
      }).catch(err => console.error("Impatience logging failed", err));
    };

    window.addEventListener("click", handleClick);
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [activeUser?.user_id]);

  // Provide context values to components
  const appContextValue = {
    chatMessages,
    setChatMessages,
    isAgentTyping,
    preferences,
    setPreferences,
    disabilities,
    setDisabilities,
    privacy,
    setPrivacy,
    learnerModel,
    setLearnerModel,
    setQuizModalOpen,
    setFeedbackModalOpen,
    setFocusConsentModalOpen,
  };

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppContext.Provider value={appContextValue}>
          <Router>
            <Box
              sx={{
                display: "flex",
                height: "100vh",
                bgcolor: "background.default",
                color: "text.primary",
              }}
            >
              <Header />
              <Sidebar />
              <Box
                component="main"
                sx={{
                  flexGrow: 1,
                  display: "flex",
                  flexDirection: "column",
                  height: "100vh",
                  overflow: "hidden",
                }}
              >
                <Routes>
                  <Route path="/dashboard" element={<Chat />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  {/* Future Routes */}
                </Routes>
              </Box>
              {/* Modals */}
              <QuizModal open={quizModalOpen} onClose={() => setQuizModalOpen(false)} />
              <FeedbackModal
                open={feedbackModalOpen}
                onClose={() => setFeedbackModalOpen(false)}
              />
              <FocusConsentModal
                open={focusConsentModalOpen}
                onClose={() => setFocusConsentModalOpen(false)}
              />
              <EmotionalSupportPopup
                open={showEmotionalSupport}
                onClose={() => setShowEmotionalSupport(false)}
              />
              <ImpatienceModal
                open={impatienceModalOpen}
                onClose={() => setImpatienceModalOpen(false)}
              />
            </Box>
          </Router>
        </AppContext.Provider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;