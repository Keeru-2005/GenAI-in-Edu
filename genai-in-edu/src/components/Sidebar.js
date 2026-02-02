// File: src/components/Sidebar.js
import React, { useContext, useState } from "react";
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
  Collapse,
  Tooltip,
} from "@mui/material";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import MenuIcon from "@mui/icons-material/Menu";
import InfoIcon from "@mui/icons-material/Info";
import { AppContext } from "../../src/App";

const drawerWidth = 320;

const disabilityConditions = [
  { label: "None", value: "none" },
  { label: "ADHD - Mild", value: "mild" },
  { label: "ADHD - Moderate", value: "moderate" },
  { label: "ADHD - Severe", value: "severe" },
  { label: "Autism", value: "autism" },
  { label: "Dyslexia", value: "dyslexia" },
];

export default function Sidebar() {
  const {
    preferences,
    setPreferences,
    disabilities,
    setDisabilities,
    privacy,
    setPrivacy,
    learnerModel,
  } = useContext(AppContext);

  const [open, setOpen] = useState(true);

  // Handlers for preferences sliders
  const handleGranularityChange = (_, value) =>
    setPreferences((prev) => ({ ...prev, feedbackGranularity: value }));
  const handleAnxietyChange = (_, value) =>
    setPreferences((prev) => ({ ...prev, anxietyLevel: value }));
  const handleModalityChange = (event) =>
    setPreferences((prev) => ({ ...prev, modalityPreference: event.target.value }));

  // Disabilities form handlers
  function handleDisabilityChange(condition) {
    setDisabilities((prev) => ({
      ...prev,
      [condition]: disabilities[condition] === "none" ? "mild" : "none", // toggling simple yes/no; extend if needed
    }));
  }

  const handleDisabilitySelectChange = (event, conditionKey) => {
    setDisabilities((prev) => ({
      ...prev,
      [conditionKey]: event.target.value,
    }));
  };

  const handleConsentChange = (event) => {
    setDisabilities((prev) => ({
      ...prev,
      consent: event.target.checked,
    }));
  };

  // Privacy dashboard handlers (placeholders)
  const handleViewMetrics = () => {
    alert("Showing tracked metrics (placeholder)");
  };
  const handleDeleteData = () => {
    alert("Data deleted (placeholder)");
  };
  const handleEyeTrackingToggle = () => {
    setPrivacy((prev) => ({
      ...prev,
      eyeTrackingConsent: !prev.eyeTrackingConsent,
    }));
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
                  {conditionKey === "ADHD" && (
                    <>
                      <MenuItem value="mild">Mild</MenuItem>
                      <MenuItem value="moderate">Moderate</MenuItem>
                      <MenuItem value="severe">Severe</MenuItem>
                    </>
                  )}
                  {conditionKey !== "ADHD" && (
                    <>
                      <MenuItem value="mild">Mild</MenuItem>
                      <MenuItem value="moderate">Moderate</MenuItem>
                    </>
                  )}
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
            <FormControlLabel
              control={
                <Checkbox
                  checked={privacy.eyeTrackingConsent}
                  onChange={handleEyeTrackingToggle}
                  inputProps={{ "aria-label": "Eye-tracking consent toggle" }}
                />
              }
              label="Consent for Eye-Tracking via Webcam"
            />

            <Divider sx={{ my: 3 }} />

            {/* Learner Model Summary */}
            <Typography variant="h6" gutterBottom>
              Learner Model Summary
              <Tooltip title="Current inferred habits, focus levels, and progress">
                <InfoIcon sx={{ ml: 1, verticalAlign: "middle", fontSize: 18 }} />
              </Tooltip>
            </Typography>

            <Card elevation={3} tabIndex={0} aria-label="Learner model summary card">
              <CardContent>
                <Typography variant="body2" gutterBottom>
                  <strong>Habits:</strong> {learnerModel.habits}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Focus Level:</strong> {learnerModel.focusLevel}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Progress:</strong> {learnerModel.progress}
                </Typography>
              </CardContent>
            </Card>
          </>
        )}
      </Box>
    </Drawer>
  );
}