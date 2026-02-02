// File: src/components/EmotionalSupportPopup.js
import React from "react";
import { Snackbar, Alert, Button } from "@mui/material";

/**
 * EmotionalSupportPopup pops up suggestions like "Take a break"
 * based on user's emotional state (e.g., anxiety level).
 *
 * Props:
 *  - open: boolean
 *  - onClose: function
 */
export default function EmotionalSupportPopup({ open, onClose }) {
  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      onClose={onClose}
      autoHideDuration={10000}
      aria-live="assertive"
      aria-label="Emotional support suggestion popup"
    >
      <Alert
        onClose={onClose}
        severity="info"
        sx={{ width: "100%" }}
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => alert("Break tips (placeholder)")}
            aria-label="Show break suggestions"
          >
            Tips
          </Button>
        }
      >
        It looks like you might be feeling anxious. Consider taking a short break!
      </Alert>
    </Snackbar>
  );
}