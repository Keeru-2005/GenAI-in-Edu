// File: src/components/Settings.js
import React, { useContext } from "react";
import {
  Typography,
  Box,
  Paper,
  Button,
} from "@mui/material";
import { AppContext } from "../App";

/**
 * Settings page —
 * Currently can display user preferences & privacy info for editing or viewing.
 * Extendable for better management.
 */
export default function Settings() {
  const { preferences, disabilities, privacy } = useContext(AppContext);

  return (
    <Box
      sx={{
        p: 3,
        pt: 12,
        overflowY: "auto",
        width: "100%",
        height: "100vh",
        bgcolor: "background.default",
      }}
      aria-label="Settings page"
    >
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          User Preferences
        </Typography>

        <Typography variant="body1">
          <strong>Feedback Granularity:</strong> {preferences.feedbackGranularity}
        </Typography>
        <Typography variant="body1">
          <strong>Anxiety Level:</strong> {preferences.anxietyLevel}
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          <strong>Modality Preference:</strong> {preferences.modalityPreference}
        </Typography>
      </Paper>

      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Disability Support Info
        </Typography>
        {Object.keys(disabilities).map((key) => {
          if (key === "consent") {
            return (
              <Typography key={key} variant="body1">
                <strong>Consent to share disability info:</strong>{" "}
                {disabilities[key] ? "Yes" : "No"}
              </Typography>
            );
          }
          return (
            <Typography key={key} variant="body1">
              <strong>{key}:</strong> {disabilities[key]}
            </Typography>
          );
        })}
      </Paper>

      <Paper elevation={3} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Privacy & Consents
        </Typography>
        <Typography variant="body1">
          <strong>Eye Tracking Consent:</strong>{" "}
          {privacy.eyeTrackingConsent ? "Granted" : "Not Granted"}
        </Typography>

        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            color="error"
            onClick={() => alert("Delete data placeholder")}
            aria-label="Delete all personal data"
          >
            Delete All Personal Data
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}