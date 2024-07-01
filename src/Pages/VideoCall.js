import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Draggable from 'react-draggable';
import { io } from 'socket.io-client';

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
        socketRef.current = io('http://localhost:5000/');
        const socket = socketRef.current;

        socket.emit('join-room', { roomID });

        socket.on('room-busy', () => {
            toast.error("Room is busy", {
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
        });

        socket.on('offer', handleOffer);
        socket.on('answer', handleAnswer);
        socket.on('ice-candidate', handleNewICECandidateMsg);
        socket.on('leave-call', closeConnection);

        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
            setLocalStream(stream);
            setupPeerConnection(stream);
        });

        return () => {
            cleanupCall();
        };
    }, [roomID]);

    const setupPeerConnection = (stream) => {
        const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
        peerConnection.current = new RTCPeerConnection(configuration);
        stream.getTracks().forEach((track) => {
            peerConnection.current.addTrack(track, stream);
        });

        peerConnection.current.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };

        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit('ice-candidate', {
                    roomID,
                    candidate: event.candidate,
                });
            }
        };
    };

    const handleOffer = async ({ offer }) => {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);

        socketRef.current.emit('answer', {
            roomID,
            answer: answer,
        });
    };

    const handleAnswer = async ({ answer }) => {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleNewICECandidateMsg = async ({ candidate }) => {
        try {
            await peerConnection.current.addIceCandidate(candidate);
        } catch (e) {
            console.error('Error adding received ice candidate', e);
        }
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
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
    };

    const closeConnection = () => {
        toast.info("Other user left the call, redirecting to home page!", {
           
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

    const callUser = async () => {
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);

        socketRef.current.emit('offer', {
            roomID,
            offer: offer,
        });
    };

    const leaveCall = () => {
        socketRef.current.emit('leave-call', {
            roomID: roomID,
        });
        cleanupCall();
        navigate("/");
    };

    const toggleCamera = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach((track) => {
                track.enabled = !track.enabled;
            });
            setIsCameraOff(!isCameraOff);
        }
    };

    const toggleMic = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach((track) => {
                track.enabled = !track.enabled;
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
