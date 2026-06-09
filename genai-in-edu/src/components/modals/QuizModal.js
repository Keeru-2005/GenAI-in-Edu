// // File: src/components/modals/QuizModal.js
// import React, { useState } from "react";
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Button,
//   RadioGroup,
//   FormControlLabel,
//   Radio,
//   TextField,
//   Typography,
//   Box,
// } from "@mui/material";

// /**
//  * QuizModal for micro-quizzing interactions.
//  * Props:
//  *  - open: boolean
//  *  - onClose: function
//  *  - questions: optional (for now static example inside)
//  */
// export default function QuizModal({ open, onClose }) {
//   // Sample quiz question data (hardcoded placeholder)
//   const questions = [
//     {
//       id: 1,
//       question: "What is React primarily used for?",
//       type: "mcq",
//       options: [
//         "Backend Development",
//         "Building user interfaces",
//         "Database management",
//         "Networking",
//       ],
//     },
//     {
//       id: 2,
//       question: "Explain the concept of a hook in React.",
//       type: "longAnswer",
//     },
//   ];

//   // Store answers locally for demo purposes
//   const [answers, setAnswers] = useState({});

//   const handleChangeMCQ = (questionId, answer) => {
//     setAnswers((prev) => ({ ...prev, [questionId]: answer }));
//   };

//   const handleChangeLongAnswer = (questionId, text) => {
//     setAnswers((prev) => ({ ...prev, [questionId]: text }));
//   };

//   const handleSubmit = () => {
//     console.log("User quiz answers:", answers);
//     alert("Quiz submitted (placeholder)");
//     onClose();
//   };

//   return (
//     <Dialog open={open} onClose={onClose} aria-labelledby="quiz-dialog-title" maxWidth="sm" fullWidth>
//       <DialogTitle id="quiz-dialog-title">Quick Quiz</DialogTitle>
//       <DialogContent dividers>
//         {questions.map((q) => (
//           <Box key={q.id} sx={{ mb: 3 }}>
//             <Typography
//               variant="subtitle1"
//               component="legend"
//               tabIndex={0}
//               aria-label={`Quiz question: ${q.question}`}
//               sx={{ mb: 1 }}
//             >
//               {q.question}
//             </Typography>

//             {q.type === "mcq" && (
//               <RadioGroup
//                 aria-label={`Options for: ${q.question}`}
//                 name={`quiz-question-${q.id}`}
//                 value={answers[q.id] || ""}
//                 onChange={(e) => handleChangeMCQ(q.id, e.target.value)}
//               >
//                 {q.options.map((opt, i) => (
//                   <FormControlLabel
//                     value={opt}
//                     key={i}
//                     control={<Radio />}
//                     label={opt}
//                   />
//                 ))}
//               </RadioGroup>
//             )}

//             {q.type === "longAnswer" && (
//               <TextField
//                 aria-label={`Answer to: ${q.question}`}
//                 multiline
//                 minRows={3}
//                 fullWidth
//                 value={answers[q.id] || ""}
//                 onChange={(e) => handleChangeLongAnswer(q.id, e.target.value)}
//               />
//             )}
//           </Box>
//         ))}
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={onClose} aria-label="Cancel quiz">
//           Cancel
//         </Button>
//         <Button onClick={handleSubmit} variant="contained" aria-label="Submit quiz">
//           Submit
//         </Button>
//       </DialogActions>
//     </Dialog>
//   );
// }
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio
} from "@mui/material";
import axios from "axios";

export default function QuizModal({ open, onClose, quizData, user_id, topic }) {
  const [answers, setAnswers] = useState([]);
if (!quizData || quizData.length === 0) {
  return null;
}
  
  const handleSelect = (qIndex, option) => {
    const updated = [...answers];
    updated[qIndex] = option;
    setAnswers(updated);
  };

  const handleSubmit = async () => {
    const correct = quizData.map(q => q.answer);
    const options = quizData.map(q => q.options);
    const questions = quizData.map(q => q.question);

    const res = await axios.post("http://localhost:8000/submit-quiz", {
      user_id,
      topic,
      answers,
      correct_answers: correct,
      options,
      questions
    });

    alert(`Score: ${res.data.score * 100}%\n${res.data.feedback}`);
    // onClose();

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("quiz-feedback", {
        detail: res.data
      }));
    }, 200);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Quick Quiz</DialogTitle>
      <DialogContent>
        {(quizData || []).map((q, idx) => (
          <div key={idx}>
            <p>{q.question}</p>
            <RadioGroup onChange={(e) => handleSelect(idx, e.target.value)}>
              {q.options.map((opt, i) => (
                <FormControlLabel
                  key={i}
                  value={opt}
                  control={<Radio />}
                  label={opt}
                />
              ))}
            </RadioGroup>
          </div>
        ))}

        <Button onClick={handleSubmit} variant="contained">
          Submit
        </Button>
      </DialogContent>
    </Dialog>
  );
}