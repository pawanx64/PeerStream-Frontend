import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

export const NavBar = () => {
  

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
