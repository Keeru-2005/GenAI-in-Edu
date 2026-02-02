// File: src/components/modals/FocusConsentModal.js
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  FormControlLabel,
  Box,
  Typography,
} from "@mui/material";

/**
 * FocusConsentModal with webcam preview placeholder and opt-in checkbox.
 * Permissions for eye-tracking consent.
 */
export default function FocusConsentModal({ open, onClose }) {
  const [consent, setConsent] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  const videoRef = React.useRef(null);

  // Attempt to get webcam preview on open
  useEffect(() => {
    if (open) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: true })
          .then((stream) => {
            setWebcamStream(stream);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          })
          .catch(() => {
            setWebcamStream(null);
          });
      }
    } else {
      // Stop webcam stream on close
      if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
        setWebcamStream(null);
      }
      setConsent(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = () => {
    if (consent) {
      alert("Eye-tracking consent granted (placeholder)");
      onClose();
    } else {
      alert("Please provide consent to enable eye-tracking");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="focus-consent-dialog" maxWidth="sm" fullWidth>
      <DialogTitle id="focus-consent-dialog">Eye-Tracking Consent</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1" gutterBottom>
          To estimate your focus level more accurately, we request permission to use your webcam
          to track eye movements. Your privacy and data security are our utmost priority.
        </Typography>
        <Box
          sx={{
            mt: 2,
            display: "flex",
            justifyContent: "center",
          }}
        >
          {webcamStream ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              width="100%"
              height="240px"
              style={{ borderRadius: 8, backgroundColor: "#000" }}
              aria-label="Webcam preview"
            />
          ) : (
            <Typography variant="body2" color="error">
              Webcam access not available or denied.
            </Typography>
          )}
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              inputProps={{ "aria-label": "I consent to eye-tracking via webcam" }}
            />
          }
          label="I consent to eye-tracking via webcam"
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} aria-label="Cancel eye-tracking consent">
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          aria-label="Confirm eye-tracking consent"
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}