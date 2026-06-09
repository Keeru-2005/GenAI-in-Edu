import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";

export default function UserInsights() {
  const { activeUser } = useContext(UserContext);
  const [data, setData] = useState(null);

  useEffect(() => {
    axios
      .get(`http://localhost:8000/user-insights/${activeUser.user_id}`)
      .then((res) => setData(res.data));
  }, []);

  if (!data) return <p>Loading...</p>;

  return (
    <div>
      <h2>🧠 Your Learning Profile</h2>

      <h3>Disabilities</h3>
      <pre>{JSON.stringify(data.disabilities, null, 2)}</pre>

      <h3>Preferred Modality</h3>
      <p>{data.preferred_modality}</p>

      <h3>Interaction Breakdown</h3>
      <pre>{JSON.stringify(data.modality_breakdown, null, 2)}</pre>
    </div>
  );
}