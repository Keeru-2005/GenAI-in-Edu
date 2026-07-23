// src/context/UserContext.js
import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [activeUser, setActiveUser] = useState({ user_id: "loading", name: "Loading..." });
  const [users, setUsers] = useState([]);

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

  useEffect(() => {
    axios.get(`${API_BASE}/users`)
      .then(res => {
        const fetchedUsers = res.data.users || [];
        if (fetchedUsers.length > 0) {
          setUsers(fetchedUsers);
          setActiveUser(fetchedUsers[0]);
        } else {
          // Fallback just in case DB is totally empty
          const fallback = { user_id: "user_fallback", name: "Local Learner" };
          setUsers([fallback]);
          setActiveUser(fallback);
        }
      })
      .catch(err => {
        console.error("Failed to fetch users from DB", err);
      });
  }, [API_BASE]);

  const createNewProfile = async (username) => {
    try {
      const res = await axios.post(`${API_BASE}/create-profile`, { username });
      const newUser = res.data;
      setUsers(prev => [...prev, newUser]);
      setActiveUser(newUser);
    } catch (err) {
      console.error("Failed to create new profile", err);
      alert("Error creating profile. Is the backend running?");
    }
  };

  return (
    <UserContext.Provider value={{ activeUser, setActiveUser, users, createNewProfile }}>
      {children}
    </UserContext.Provider>
  );
};
