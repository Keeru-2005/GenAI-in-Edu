// File: src/components/Sidebar.js
import React, { useContext, useState, useEffect } from "react";
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  Divider,
  Slider,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Card,
  CardContent,
  Tooltip,
} from "@mui/material";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import MenuIcon from "@mui/icons-material/Menu";
import InfoIcon from "@mui/icons-material/Info";
import { AppContext } from "../../src/App";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import FocusDashboard from "./modals/FocusDashboard";


const drawerWidth = 320;

export default function Sidebar() {
  const {
    preferences,
    setPreferences,
    disabilities,
    setDisabilities,
    // learnerModel,
  } = useContext(AppContext);
  const { activeUser } = useContext(UserContext);


  const [open, setOpen] = useState(true);
  const [focusDashboardOpen, setFocusDashboardOpen] = useState(false);

  useEffect(() => {
    if (!activeUser?.user_id) return;

    axios
      .get(`http://localhost:8000/user-disabilities/${activeUser.user_id}`)
      .then((res) => {
        setDisabilities(prev => ({
          ...prev,
          ADHD: res.data.ADHD || "none",
          Autism: res.data.Autism || "none",
          Dyslexia: res.data.Dyslexia || "none",
          consent: res.data.consent || false,
        }));
      })
      .catch((err) => {
        console.error("Failed to fetch disabilities", err);
      });
  }, [activeUser.user_id, setDisabilities]);


  // Handlers for preferences sliders
  const handleGranularityChange = (_, value) =>
    setPreferences((prev) => ({ ...prev, feedbackGranularity: value }));
  const handleAnxietyChange = (_, value) => {
    setPreferences((prev) => ({ ...prev, anxietyLevel: value }));

    axios.post("http://localhost:8000/update-emotional-state", {
      user_id: activeUser.user_id,
      anxiety_level: value,
    });
  };

  const handleModalityChange = (event) => {
    setPreferences((prev) => ({ ...prev, modalityPreference: event.target.value }));
    axios.post("http://localhost:8000/log-modality-event", {
      user_id: activeUser.user_id,
      modality: event.target.value,
      event: event.target.value,
      duration: 0,
    });
  }


  const handleDisabilitySelectChange = async (event, conditionKey) => {
    const severity = event.target.value;

    // UI update
    setDisabilities(prev => ({
      ...prev,
      [conditionKey]: severity,
    }));

    if (!disabilities.consent) return;
    if (!activeUser?.user_id) {
      console.error("❌ No active user");
      return;
    }

    try {
      await axios.post(
        "http://localhost:8000/update-disability",
        {
          user_id: activeUser.user_id,
          condition: conditionKey,
          severity,
          consent: true,
          declared_at: new Date().toISOString(),
        },
        { headers: { "Content-Type": "application/json" } }
      );

      console.log(`✅ Stored ${conditionKey}:${severity}`);
    } catch (err) {
      console.error("❌ Backend error:", err.response?.data);
    }
  };

  const handleConsentChange = async (event) => {
    const consent = event.target.checked;

    setDisabilities(prev => ({
      ...prev,
      consent,
    }));

    if (!consent) return;
    if (!activeUser?.user_id) return;

    for (const condition of ["ADHD", "Autism", "Dyslexia"]) {
      const severity = disabilities[condition];
      if (!severity || severity === "none") continue;

      await axios.post(
        "http://localhost:8000/update-disability",
        {
          user_id: activeUser.user_id,
          condition,
          severity,
          consent: true,
        },
        { headers: { "Content-Type": "application/json" } }
      );
    }
  };





  // Privacy dashboard handlers (placeholders)
  const handleViewMetrics = () => {
    setFocusDashboardOpen(true);
  };
  const handleDeleteData = async () => {
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
  };
  // Sidebar collapse toggle
  const toggleDrawer = () => {
    setOpen(!open);
  };

  return (
    <Drawer
      variant="permanent"
      open={open}
      sx={{
        width: open ? drawerWidth : 56,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: open ? drawerWidth : 56,
          boxSizing: "border-box",
          transition: (theme) =>
            theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          overflowX: "hidden",
          bgcolor: "background.paper",
        },
      }}
      PaperProps={{ "aria-label": "Adaptive Learning Agent Sidebar" }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "flex-end" : "center",
          px: 1,
          py: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <IconButton
          onClick={toggleDrawer}
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          size="large"
        >
          {open ? <MenuOpenIcon /> : <MenuIcon />}
        </IconButton>
      </Box>

      <Box
        sx={{
          px: 2,
          py: 1,
          overflowY: "auto",
          height: `calc(100% - 56px)`,
        }}
      >
        {open && (
          <>
            {/* User Preferences Section */}
            <Typography variant="h6" gutterBottom id="user-preferences-label">
              User Preferences
            </Typography>

            <Typography gutterBottom id="feedback-granularity-slider" tabIndex={0}>
              Feedback Granularity: {preferences.feedbackGranularity}
            </Typography>
            <Slider
              aria-labelledby="feedback-granularity-slider"
              value={preferences.feedbackGranularity}
              onChange={handleGranularityChange}
              min={0}
              max={10}
              step={1}
              valueLabelDisplay="auto"
            />

            <Typography gutterBottom id="anxiety-level-slider" tabIndex={0}>
              Emotional State (Anxiety Level): {preferences.anxietyLevel}
            </Typography>
            <Slider
              aria-labelledby="anxiety-level-slider"
              value={preferences.anxietyLevel}
              onChange={handleAnxietyChange}
              min={0}
              max={10}
              step={1}
              valueLabelDisplay="auto"
            />

            <FormControl
              component="fieldset"
              sx={{ mt: 2 }}
              aria-labelledby="modality-preference-radio"
            >
              <Typography id="modality-preference-radio" gutterBottom>
                Modality Preference
              </Typography>
              <RadioGroup
                aria-label="modality preference"
                name="modality-preference"
                value={preferences.modalityPreference}
                onChange={handleModalityChange}
                row
              >
                <FormControlLabel value="text" control={<Radio />} label="Text" />
                <FormControlLabel value="audio" control={<Radio />} label="Audio" />
                <FormControlLabel value="video" control={<Radio />} label="Video" />
                <FormControlLabel value="diagram" control={<Radio />} label="Diagrams" />
              </RadioGroup>
            </FormControl>

            <Divider sx={{ my: 3 }} />

            {/* Disability Support Form */}
            <Typography variant="h6" gutterBottom>
              Disability Support
            </Typography>

            {["ADHD", "Autism", "Dyslexia"].map((conditionKey) => (
              <Box key={conditionKey} sx={{ mb: 2 }}>
                <InputLabel id={`${conditionKey}-label`}>
                  {conditionKey}
                </InputLabel>
                <Select
                  labelId={`${conditionKey}-label`}
                  value={disabilities[conditionKey] || "none"}
                  onChange={(e) => handleDisabilitySelectChange(e, conditionKey)}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="none">None</MenuItem>
                  <MenuItem value="mild">Mild</MenuItem>
                  <MenuItem value="moderate">Moderate</MenuItem>
                  <MenuItem value="severe">Severe</MenuItem>
                </Select>
              </Box>
            ))}

            <FormControlLabel
              control={
                <Checkbox
                  checked={disabilities.consent || false}
                  onChange={handleConsentChange}
                  inputProps={{ "aria-label": "Consent for disability data usage" }}
                />
              }
              label="I consent to share this information for better personalization"
            />

            <Divider sx={{ my: 3 }} />

            {/* Privacy Dashboard */}
            <Typography variant="h6" gutterBottom>
              Privacy Dashboard
            </Typography>

            <Button
              variant="outlined"
              fullWidth
              sx={{ mb: 1 }}
              onClick={handleViewMetrics}
              aria-label="View tracked metrics"
            >
              View Tracked Metrics
            </Button>
            <Button
              variant="outlined"
              color="error"
              fullWidth
              sx={{ mb: 1 }}
              onClick={handleDeleteData}
              aria-label="Delete my data"
            >
              Delete My Data
            </Button>

            <Divider sx={{ my: 3 }} />

          </>
        )}
      </Box>
      <FocusDashboard open={focusDashboardOpen} onClose={() => setFocusDashboardOpen(false)} />
    </Drawer>
  );
}