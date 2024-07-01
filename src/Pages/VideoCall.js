import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Draggable from 'react-draggable';

export const VideoCall = () => {
    const { roomID } = useParams();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const peerConnection = useRef(null);
  const socketRef = useRef(null);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Initializing WebSocket connection
    socketRef.current = new WebSocket('http://localhost:5000/');
    const socket = socketRef.current;

    socket.onopen = () => {
      console.log('WebSocket connected');
      // Joining the room with a unique room ID
      socket.send(JSON.stringify({ type: 'join-room', roomID }));
    };
    //Handling all possible messages received from the WebSocket server
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'offer':
          handleOffer(msg.offer);
          break;
        case 'answer':
          handleAnswer(msg.answer);
          break;
        case 'ice-candidate':
          handleNewICECandidateMsg(msg.candidate);
          break;
        case 'leave-call':
          closeConnection();
          break;
        case 'room-busy':
            toast.error("Room Is Busy", {
                position: "top-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light",
            });
            navigate('/');
            break;
       
      }
    };

    //Permission to access the webcam and microphone
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      setLocalStream(stream);
      // When local stream is obtained, setting up the peer connection
      setupPeerConnection(stream);
    });

    return () => {
      // Clean up on component unmount
      cleanupCall();
    };
  }, [roomID]);


  // Set up the peer connection and add the media stream tracks
  const setupPeerConnection = (stream) => {
    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    peerConnection.current = new RTCPeerConnection(configuration);
    // Add each track from the local stream to the peer connection
    stream.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, stream);
    });

    // Listen for remote stream
    peerConnection.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    // Listen for ice candidate events
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.send(
          JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate,
            roomID,
          })
        );
      }
    };
  };

  // When receiving an offer, set it as the remote description, and create an answer
  const handleOffer = async (offer) => {
    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);

    socketRef.current.send(
      JSON.stringify({
        type: 'answer',
        answer: answer,
        roomID,
      })
    );
  };

  // When receiving an answer, set it as the remote description
  const handleAnswer = async (answer) => {
    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
  };

  // When receiving a new ICE candidate, add it to the peer connection
  const handleNewICECandidateMsg = async (candidate) => {
    try {
      await peerConnection.current.addIceCandidate(candidate);
    } catch (e) {
      console.error('Error adding received ice candidate', e);
    }
  };

  //Function that handles Cleanup on call end
  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
    }
  };

  // Close connection when the call is ended by the other user
  const closeConnection = () => {
    toast.info("Other User Left the Call, Redirecting to Home page!", {
            position: "top-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "light",
    });
    cleanupCall();
    setTimeout(() => {
      navigate("/");
    }, 3000);
  };

  // To start the call, create an offer and set the local description, then send the offer to the peer
  const callUser = async () => {
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    socketRef.current.send(
      JSON.stringify({
        type: 'offer',
        offer: offer,
        roomID,
      })
    );
  };

  // Function that handles leaving the call
  const leaveCall = () => {
    // Send a message to the other peer so they can perform cleanup as well
    socketRef.current.send(JSON.stringify({
      type: 'leave-call',
      roomID: roomID,
    }));
    cleanupCall();
    navigate("/");
  };

  // Toggle the camera on/off
  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled; // Toggle the track status
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  // Toggle the microphone on/off
  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled; // Toggle the track status
      });
      setIsMicMuted(!isMicMuted);
    }
  };

  return (
    <div>
      <div className="bg-gray-900 overflow-hidden text-white min-h-screen flex flex-col items-center justify-center relative">
            <Draggable>
                <div className="absolute top-4 left-4 z-10 cursor-move">
                    <video className="w-96 h-60 rounded-3xl" autoPlay playsInline ref={video => {
                        if (video) video.srcObject = localStream;
                    }} />
                </div>
            </Draggable>

            <div className="relative w-full max-w-4xl">
                <video className="w-full rounded-lg" autoPlay playsInline ref={video => {
                    if (video) video.srcObject = remoteStream;
                }} />
                {!remoteStream && <p className="absolute inset-0 flex items-center justify-center text-lg">Start Call to connect with others in the room!</p>}
            </div>

            <div className="flex mt-4 space-x-4">
                {!remoteStream && <button onClick={callUser} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded">Start Call</button>}
                <button onClick={toggleCamera} className={`py-2 px-4 rounded ${isCameraOff ? "bg-gray-600" : "bg-red-500 hover:bg-red-600"}`}>
                    {isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                </button>
                <button onClick={toggleMic} className={`py-2 px-4 rounded ${isMicMuted ? "bg-gray-600" : "bg-red-500 hover:bg-red-600"}`}>
                    {isMicMuted ? "Unmute" : "Mute"}
                </button>
                <button onClick={leaveCall} className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded">End Call</button>
            </div>
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
        
    </div>
  );
};
