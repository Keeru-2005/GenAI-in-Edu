import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Area, AreaChart } from "recharts";
import { UserContext } from "../../context/UserContext";
import { Dialog, DialogContent, DialogTitle, IconButton, Typography, Box, Grid, Card, CardContent, Chip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import TimelineIcon from "@mui/icons-material/Timeline";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import LightbulbIcon from "@mui/icons-material/Lightbulb";

export default function FocusDashboard({ open, onClose }) {
  const { activeUser } = useContext(UserContext);
  const [data, setData] = useState([]);
  const [trend, setTrend] = useState("");
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    if (!open || !activeUser?.user_id) return;

    // Fetch Focus Trend
    axios
      .get(`http://localhost:8000/focus-trend/${activeUser.user_id}`)
      .then((res) => {
        // Fix: Use res.data.data instead of res.data.scores
        if (res.data && res.data.data) {
          setData(res.data.data);
          setTrend(res.data.trend || "Stable");
        }
      })
      .catch((err) => console.error("Error fetching focus trend:", err));

    // Fetch User Insights
    axios
      .get(`http://localhost:8000/user-insights/${activeUser.user_id}`)
      .then((res) => {
        setInsights(res.data);
      })
      .catch((err) => console.error("Error fetching user insights:", err));
  }, [open, activeUser]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          background: "rgba(30, 41, 59, 0.7)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 4,
          color: "white",
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)"
        }
      }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1, borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoGraphIcon color="primary" /> Focus & Learning Dashboard
        </Typography>
        <IconButton onClick={onClose} sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ mt: 2 }}>
        <Grid container spacing={3}>
          {/* Chart Section */}
          <Grid item xs={12} md={8}>
            <Card sx={{ background: "rgba(255, 255, 255, 0.05)", borderRadius: 3, p: 1, boxShadow: "none", border: "1px solid rgba(255,255,255,0.05)" }}>
              <CardContent>
                <Typography variant="h6" color="primary.light" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimelineIcon /> Focus Score Over Time
                </Typography>
                <Box sx={{ height: 300, width: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="session" stroke="rgba(255,255,255,0.5)" />
                      <YAxis stroke="rgba(255,255,255,0.5)" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.9)", border: "none", borderRadius: 8, color: "white" }} 
                      />
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <Area type="monotone" dataKey="score" stroke="#6366f1" fillOpacity={1} fill="url(#colorFocus)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Insights Section */}
          <Grid item xs={12} md={4}>
            <Grid container spacing={2}>
              {/* Trend Card */}
              <Grid item xs={12}>
                <Card sx={{ background: "rgba(255, 255, 255, 0.05)", borderRadius: 3, boxShadow: "none", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="rgba(255,255,255,0.6)" gutterBottom>Current Trend</Typography>
                    <Typography variant="h5" fontWeight="medium" color="secondary.light">
                      {trend}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Learning Style Card */}
              <Grid item xs={12}>
                <Card sx={{ background: "rgba(255, 255, 255, 0.05)", borderRadius: 3, boxShadow: "none", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <CardContent>
                    <Typography variant="h6" color="primary.light" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <LightbulbIcon fontSize="small" /> Learning Style
                    </Typography>
                    
                    <Typography variant="subtitle2" color="rgba(255,255,255,0.6)">Preferred Modality</Typography>
                    <Typography variant="body1" sx={{ mb: 2, textTransform: 'capitalize' }}>
                      {insights?.preferred_modality || "Unknown"}
                    </Typography>

                    {insights?.modality_breakdown && insights.modality_breakdown.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" color="rgba(255,255,255,0.6)" sx={{ mb: 1 }}>Top Engagements</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {insights.modality_breakdown.map((m, idx) => (
                            <Chip 
                              key={idx} 
                              label={`${m.modality}: ${(m.score || 0).toFixed(1)}`} 
                              size="small" 
                              sx={{ 
                                background: "rgba(99, 102, 241, 0.2)", 
                                color: "white",
                                border: "1px solid rgba(99, 102, 241, 0.5)"
                              }} 
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
}