import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

export const NavBar = () => {
  //const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [ID, setID] = useState("");

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handleIDChange = (e) => {
    setID(e.target.value);
  };

  const handleJoinRoom = () => {
    if (ID && email) {
      navigate(`/room/${ID}`);
    } else {
      alert("Please enter both Room ID and Email");
    }
  };

  return (
    <div>
      <div className="bg-gray-900 text-white shadow-md pl-10 pr-10">
        <div className="mx-auto flex justify-center items-center py-4">
          <span className="text-4xl sm:text-5xl font-bold">Peer Stream</span>
        </div>
      </div>
    </div>
  );
};
