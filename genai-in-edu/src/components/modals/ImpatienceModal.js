import React from "react";
import { Modal, Box, Typography, Button, Backdrop, Fade } from "@mui/material";
import SelfImprovementIcon from "@mui/icons-material/SelfImprovement";

export default function ImpatienceModal({ open, onClose }) {
  return (
    <Modal
      open={open}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: {
          timeout: 700,
          sx: {
            backdropFilter: "blur(10px)",
            backgroundColor: "rgba(15, 23, 42, 0.8)",
          },
        },
      }}
    >
      <Fade in={open}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90%", sm: 500 },
            bgcolor: "background.paper",
            borderRadius: 4,
            boxShadow: 24,
            p: 5,
            textAlign: "center",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            color: "white",
          }}
        >
          <SelfImprovementIcon sx={{ fontSize: 80, color: "#ec4899", mb: 2 }} />
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Take a deep breath.
          </Typography>
          <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.7)", mb: 4, lineHeight: 1.6 }}>
            You seem a bit rushed! Learning is a journey, not a race. 
            Take it slow, focus step by step, and don't hesitate to ask the AI to break things down further if it feels overwhelming.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={onClose}
            sx={{ px: 4, py: 1.5, borderRadius: 2 }}
          >
            I'm ready to continue
          </Button>
        </Box>
      </Fade>
    </Modal>
  );
}
