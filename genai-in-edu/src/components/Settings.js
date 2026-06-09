import React, { useContext, useEffect, useState } from "react";
import {
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  Chip,
  CircularProgress
} from "@mui/material";
import { AppContext } from "../App";
import { UserContext } from "../context/UserContext";
import axios from "axios";
import SettingsIcon from "@mui/icons-material/Settings";
import PsychologyIcon from "@mui/icons-material/Psychology";
import SecurityIcon from "@mui/icons-material/Security";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from "recharts";

export default function Settings() {
  const { preferences, privacy, setPrivacy } = useContext(AppContext);
  const { activeUser } = useContext(UserContext);
  const [insights, setInsights] = useState(null);
  const [mastery, setMastery] = useState([]);
  const [impatienceHistory, setImpatienceHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeUser?.user_id) return;
    
    setLoading(true);
    Promise.all([
      axios.get(`http://localhost:8000/user-insights/${activeUser.user_id}`),
      axios.get(`http://localhost:8000/concept-mastery/${activeUser.user_id}`),
      axios.get(`http://localhost:8000/impatience-history/${activeUser.user_id}`)
    ])
      .then(([insightsRes, masteryRes, impatienceRes]) => {
        setInsights(insightsRes.data);
        setMastery(masteryRes.data.mastery || []);
        setImpatienceHistory(impatienceRes.data.history || []);
      })
      .catch(err => console.error("Failed to fetch settings data", err))
      .finally(() => setLoading(false));
  }, [activeUser]);

  return (
    <Box
      sx={{
        p: 4,
        pt: 12,
        overflowY: "auto",
        width: "100%",
        height: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "white"
      }}
      aria-label="Settings page"
    >
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <SettingsIcon fontSize="large" color="primary" /> Profile & Settings
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ 
              p: 3, 
              background: "rgba(255, 255, 255, 0.03)", 
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 4,
              color: "white",
              height: "100%"
            }}>
              <Typography variant="h6" color="primary.light" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <PsychologyIcon /> Learner Profile
              </Typography>
              
              <Typography variant="subtitle2" color="rgba(255,255,255,0.5)">System Inferred Preferred Modality</Typography>
              <Typography variant="body1" sx={{ mb: 3, textTransform: "capitalize", fontWeight: "medium" }}>
                {insights?.preferred_modality || preferences.modalityPreference}
              </Typography>

              <Typography variant="subtitle2" color="rgba(255,255,255,0.5)">Current Session Settings</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3, mt: 1 }}>
                <Chip label={`Feedback Granularity: ${preferences.feedbackGranularity}/10`} sx={{ background: "rgba(99,102,241,0.2)", color: "white" }} />
                <Chip label={`Anxiety Setting: ${preferences.anxietyLevel}/10`} sx={{ background: "rgba(236,72,153,0.2)", color: "white" }} />
              </Box>

              <Typography variant="subtitle2" color="rgba(255,255,255,0.5)" sx={{ mb: 1 }}>Disability Support (Fetched from Backend)</Typography>
              {insights?.disabilities && Object.keys(insights.disabilities).length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {Object.entries(insights.disabilities).map(([key, value]) => (
                     <Typography key={key} variant="body2" sx={{ background: "rgba(0,0,0,0.2)", p: 1, borderRadius: 1 }}>
                       <strong>{key}:</strong> {value}
                     </Typography>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="rgba(255,255,255,0.4)">No disability profiles registered.</Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ 
              p: 3, 
              background: "rgba(255, 255, 255, 0.03)", 
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 4,
              color: "white"
            }}>
              <Typography variant="h6" color="secondary.light" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <SecurityIcon /> Privacy & Data
              </Typography>
              
              <Typography variant="subtitle2" color="rgba(255,255,255,0.5)">Eye Tracking Consent</Typography>
              <Typography variant="body1" sx={{ mb: 2, fontWeight: "medium" }}>
                {privacy.eyeTrackingConsent ? "✅ Granted" : "❌ Not Granted"}
              </Typography>
              <Button 
                variant="outlined" 
                size="small"
                color={privacy.eyeTrackingConsent ? "warning" : "primary"}
                onClick={() => setPrivacy(prev => ({...prev, eyeTrackingConsent: !prev.eyeTrackingConsent}))}
                sx={{ mb: 4 }}
              >
                {privacy.eyeTrackingConsent ? "Revoke Consent" : "Grant Consent"}
              </Button>

              <Box sx={{ mt: 2, pt: 3, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                <Typography variant="subtitle2" color="rgba(255,255,255,0.5)" mb={2}>Danger Zone</Typography>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={async () => {
                    if (!activeUser?.user_id) return;
                    if (window.confirm("Are you sure you want to delete all personal data?")) {
                      try {
                        await axios.delete(`http://localhost:8000/delete-user-data/${activeUser.user_id}`);
                        alert("All personal data has been deleted.");
                      } catch (e) {
                        alert("Failed to delete data.");
                        console.error(e);
                      }
                    }
                  }}
                  aria-label="Delete all personal data"
                  sx={{ borderRadius: 2 }}
                >
                  Delete All Personal Data
                </Button>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper elevation={0} sx={{ 
              p: 3, 
              background: "rgba(255, 255, 255, 0.03)", 
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 4,
              color: "white"
            }}>
              <Typography variant="h6" color="primary.light" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <PsychologyIcon /> Concept Mastery
              </Typography>
              
              {mastery && mastery.length > 0 ? (
                <Box sx={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mastery} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <XAxis dataKey="concept" stroke="rgba(255,255,255,0.5)" />
                      <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 100]} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                        itemStyle={{ color: "#fff" }}
                        formatter={(value) => [`${value}%`, 'Mastery Score']}
                      />
                      <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                        {
                          mastery.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.score >= 70 ? "#4ade80" : entry.score >= 40 ? "#fbbf24" : "#f87171"} />
                          ))
                        }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Typography variant="body2" color="rgba(255,255,255,0.4)">
                  No concept mastery data available yet. Start answering quizzes to see your progress!
                </Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper elevation={0} sx={{ 
              p: 3, 
              background: "rgba(255, 255, 255, 0.03)", 
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 4,
              color: "white"
            }}>
              <Typography variant="h6" color="secondary.light" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <SecurityIcon /> Patience & Focus Improvement
              </Typography>
              
              {impatienceHistory && impatienceHistory.length > 0 ? (
                <Box sx={{ width: "100%", height: 300 }}>
                  <Typography variant="body2" color="rgba(255,255,255,0.6)" mb={2}>
                    This chart tracks the number of times you felt impatient or frustrated (detected via rapid clicking or scrolling). A downward trend means your focus is improving!
                  </Typography>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={impatienceHistory} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" />
                      <YAxis stroke="rgba(255,255,255,0.5)" allowDecimals={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                        itemStyle={{ color: "#ec4899" }}
                        formatter={(value) => [value, 'Impatience Events']}
                      />
                      <Line type="monotone" dataKey="events" stroke="#ec4899" strokeWidth={3} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Typography variant="body2" color="rgba(255,255,255,0.4)">
                  No impatience events logged! You're doing a great job staying focused and calm.
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}