import React from 'react';
import { Modal, Button, Typography } from '@mui/material';

const FeedbackModal = ({ open, onClose }) => (
  <Modal open={open} onClose={onClose}>
    <div style={{ padding: 20, background: '#fff', margin: '10% auto', maxWidth: 500 }}>
      <Typography>Feedback: Detailed or Summary (Stub)</Typography>
      <Button onClick={onClose}>Close</Button>
    </div>
  </Modal>
);

export default FeedbackModal;