import React,{useState} from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer,toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css';
import image1 from '../Assest/image2.webp'

export const HeroSection = () => {
  const [ID, setID] = useState("");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setID(e.target.value);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const isValidEmail = (email) => {
    // Basic regex for email validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleClick = () => {
    if (ID === "" || email === "") {
      toast.error("Please Enter Room ID and Email", {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
    }
    else if (!isValidEmail(email)) { // Check if email is valid
      toast.error("Please enter a valid email address", {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
    } 
    else {
      //setUser(email);
      navigate(`/room/${ID}`, { state: { email } });
    }
  };

  return (
    <div>
      <div>
        <div className="bg-gray-900 text-white min-h-screen flex flex-col-reverse gap-6 md:gap-0 md:flex-row justify-center items-center p-6">
          <div className="flex flex-col justify-center items-center md:w-1/2 mb-12 md:mb-0">
            <h1 className="text-2xl sm:text-4xl flex flex-col justify-center gap-2 items-center font-bold mb-6">
              <span>Connect Instantly,</span>
              <span>Chat Seamlessly.</span>
            </h1>
            <p className="text-lg mb-8 flex flex-col justify-center gap-2 items-center text-center">
              <span>Experience the Power of Peer-to-Peer</span>
              <span>Communication with our Secure and User-Friendly</span>
              <span>Chat App. Create or Join a Room Using Room ID</span>
            </p>
            <input
              className="w-full max-w-md p-3 mb-4 rounded border border-gray-700 bg-gray-800 text-white focus:outline-none"
              type="text"
              placeholder="Enter Room Id"
              onChange={handleInputChange}
              value={ID}
              name="ID"
            />
            <input
              className="w-full max-w-md p-3 mb-4 rounded border border-gray-700 bg-gray-800 text-white focus:outline-none"
              type="email"
              placeholder="Enter Your Email"
              onChange={handleEmailChange}
              value={email}
              name="email"
            />
            <button
              className="w-full max-w-md p-3 rounded bg-blue-500 hover:bg-blue-600 text-white font-semibold"
              onClick={handleClick}
            >
              Join Room
            </button>
            <ToastContainer
              position="top-center"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
          </div>
          <div className="flex justify-center items-center md:w-1/2">
            <img src={image1} alt="logo" className=" object-cover" />
          </div>
        </div>
      </div>
    </div>
  );
};
