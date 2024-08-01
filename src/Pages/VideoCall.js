import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Draggable from "react-draggable";
import { io } from "socket.io-client";

const VideoElement = React.memo(({ stream, className, autoPlay }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      className={className}
      autoPlay={autoPlay}
      playsInline
    />
  );
});

export const VideoCall = () => {
  const { roomID } = useParams();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const peerConnection = useRef(null);
  const socketRef = useRef(null);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
  const location = useLocation();
  const { name } = location.state;

  useEffect(() => {
    socketRef.current = io("http://localhost:5000/");
    const socket = socketRef.current;

    socket.emit("join-room", { roomID });

    socket.on("room-busy", () => {
      toast.error("Room is busy");
      navigate("/");
    });

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleNewICECandidateMsg);
    socket.on("leave-call", closeConnection);
    socket.on("screen-share-started", handleScreenShareStarted);
    socket.on("screen-share-stopped", handleScreenShareStopped);
    socket.on("receive-message", handleReceiveMessage);

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        setupPeerConnection(stream);
      })
      .catch((error) => toast.error("Error accessing media devices:", error));

    return () => cleanupCall();
  }, [roomID, navigate]);

  const setupPeerConnection = (stream) => {
    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };
    peerConnection.current = new RTCPeerConnection(configuration);
    stream
      .getTracks()
      .forEach((track) => peerConnection.current.addTrack(track, stream));

    peerConnection.current.ontrack = (event) =>
      setRemoteStream(event.streams[0]);

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("ice-candidate", {
          roomID,
          candidate: event.candidate,
        });
      }
    };
  };

  const handleOffer = async ({ offer }) => {
    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(offer)
    );
    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);
    socketRef.current.emit("answer", { roomID, answer });
  };

  const handleAnswer = async ({ answer }) => {
    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  };

  const handleNewICECandidateMsg = async ({ candidate }) => {
    try {
      await peerConnection.current.addIceCandidate(candidate);
    } catch (e) {
      console.error("Error adding received ice candidate", e);
    }
  };

  const handleScreenShareStarted = () => {
    setScreenStream(null); // Reset screen stream when the remote peer starts screen sharing
  };

  const handleScreenShareStopped = () => {
    setScreenStream(null); // Clear screen stream when the remote peer stops screen sharing
  };

  const handleReceiveMessage = (message) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  };

  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  const closeConnection = () => {
    toast.info("Other user left the call, redirecting to home page!");
    cleanupCall();
    setTimeout(() => navigate("/"), 3000);
  };

  const callUser = async () => {
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    socketRef.current.emit("offer", { roomID, offer });
  };

  const leaveCall = () => {
    socketRef.current.emit("leave-call", { roomID });
    cleanupCall();
    navigate("/");
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));
      setIsCameraOff((prev) => !prev);
    }
  };

  const toggleMic = () => {
    if (localStream) {
      localStream
        .getAudioTracks()
        .forEach((track) => (track.enabled = !track.enabled));
      setIsMicMuted((prev) => !prev);
    }
  };

  const startScreenShare = () => {
    navigator.mediaDevices
      .getDisplayMedia({ video: true, audio: true })
      .then((stream) => {
        setScreenStream(stream);
        stream
          .getTracks()
          .forEach((track) => peerConnection.current.addTrack(track, stream));
        socketRef.current.emit("screen-share-started", { roomID });
      })
      .catch((error) => toast.error("Error accessing screen sharing:", error));
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
      socketRef.current.emit("screen-share-stopped", { roomID });
    }
  };

  const sendMessage = useCallback(() => {
    if (newMessage.trim()) {
      const message = { content: newMessage, sender: name };
      socketRef.current.emit("send-message", { roomID, message });
      setMessages((prevMessages) => [...prevMessages, message]);
      setNewMessage("");
    }
  }, [newMessage, roomID, name]);

  return (
    <div className="relative bg-gradient-to-r from-gray-800 via-gray-900 to-black min-h-screen flex flex-col items-center justify-center p-6">
      <div className="relative w-full max-w-4xl mb-8">
        <Draggable>
          <div className="absolute top-4 left-4 z-10 cursor-move shadow-lg rounded-lg overflow-hidden">
            <VideoElement
              stream={localStream}
              className="w-60 h-60 rounded-lg"
              autoPlay
            />
          </div>
        </Draggable>

        <div className="relative w-full max-w-4xl">
          {screenStream ? (
            <VideoElement
              stream={screenStream}
              className="w-full rounded-lg border-4 border-green-500 shadow-lg"
              autoPlay
            />
          ) : (
            <VideoElement
              stream={remoteStream}
              className="w-full rounded-lg border-4 border-red-500 shadow-lg"
              autoPlay
            />
          )}
          {!remoteStream && !screenStream && (
            <p className="absolute inset-0 flex items-center justify-center text-lg text-gray-400">
              Start Call to connect with others in the room!
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-8">
        {!remoteStream && !screenStream && (
          <button
            onClick={callUser}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105"
          >
            Start Call
          </button>
        )}
        {screenStream ? (
          <button
            onClick={stopScreenShare}
            className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105"
          >
            Stop Screen Share
          </button>
        ) : (
          <button
            onClick={startScreenShare}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105"
          >
            Share Screen
          </button>
        )}
        <button
          onClick={toggleCamera}
          className={`py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 ${
            isCameraOff ? "bg-gray-600" : "bg-blue-500 hover:bg-blue-600"
          } text-white font-semibold`}
        >
          {isCameraOff ? "Turn On Camera" : "Turn Off Camera"}
        </button>
        <button
          onClick={toggleMic}
          className={`py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 ${
            isMicMuted ? "bg-gray-600" : "bg-yellow-500 hover:bg-yellow-600"
          } text-white font-semibold`}
        >
          {isMicMuted ? "Unmute Mic" : "Mute Mic"}
        </button>
        <button
          onClick={() => setIsChatPanelOpen((prev) => !prev)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105"
        >
          Chat
        </button>
        <button
          onClick={leaveCall}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105"
        >
          End Call
        </button>
      </div>

      <div
        className={`fixed top-0 right-0 w-80 bg-gray-800 rounded-l-lg shadow-lg p-4 transform ${
          isChatPanelOpen ? "translate-x-0" : "translate-x-full"
        } transition-transform duration-300`}
      >
        <div className="h-64 overflow-y-auto bg-gray-900 rounded-lg p-4 mb-2">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`p-4 my-2 rounded-lg shadow-lg transition-transform transform ${
                message.sender === name
                  ? "bg-gradient-to-r from-blue-500 to-blue-700 text-white"
                  : "bg-gradient-to-r from-gray-700 to-gray-900 text-gray-200"
              } hover:scale-105`}
            >
              <div className="flex flex-col">
                <div className="flex items-center">
                  <span
                    className={`text-sm font-medium ${
                      message.sender === name
                        ? "text-yellow-300"
                        : "text-green-300"
                    }`}
                  >
                    {message.sender}
                  </span>
                  <span className="ml-2 text-sm text-gray-400">:</span>
                </div>
                <div className="mt-1 whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-l-lg shadow-inner focus:outline-none"
            placeholder="Type your message..."
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg shadow-md transition-transform transform hover:scale-105"
          >
            Send
          </button>
        </div>
      </div>

      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
      />
    </div>
  );
};
