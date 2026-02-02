// src/context/UserContext.js
import React, { createContext, useState } from "react";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [activeUser, setActiveUser] = useState({
    user_id: "user_1",
    name: "Anxious Beginner"
  });

  const users = [
    { user_id: "user_1", name: "Anxious Beginner" },
    { user_id: "user_2", name: "Visual Learner" },
    { user_id: "user_3", name: "ADHD Learner" },
    { user_id: "user_4", name: "Advanced Learner" },
    { user_id: "user_5", name: "Persistent Learner" },
  ];

  return (
    <UserContext.Provider value={{ activeUser, setActiveUser, users }}>
      {children}
    </UserContext.Provider>
  );
};
