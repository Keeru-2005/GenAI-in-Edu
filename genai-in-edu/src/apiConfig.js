// src/apiConfig.js
const rawUrl = process.env.REACT_APP_API_URL || "http://localhost:8000";
export const API_BASE = rawUrl.replace(/\/+$/, "");
