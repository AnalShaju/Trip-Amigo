"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { TypewriterEffect } from "@/components/ui/typewriter-effect";

export default function ChatPage() {
  const words = [
    { text: "Powered" },
    { text: "by" },
    { text: "Tavily Search" },
    { text: " + Groq AI" },
  ];

  const [messages, setMessages] = useState([
    {
      type: "ai",
      content:
        "Hi! I'm your travel planning assistant. I can help you plan your perfect trip! Just tell me where you'd like to go, and I'll help you create an amazing itinerary. For example, you can say 'Plan me a trip to Mumbai'.",
      id: Date.now(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [currentContext, setCurrentContext] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Voice recognition refs
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Speech Recognition
  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported in this browser");
      setVoiceSupported(false);
      return;
    }

    // Create recognition instance
    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Stop after one result
    recognition.interimResults = false; // Only final results
    recognition.lang = "en-US"; // Set language

    // Handle results
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log("Voice input:", transcript);
      setInputMessage(transcript);
      setIsRecording(false);
      setIsListening(false);
    };

    // Handle errors
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
      setIsListening(false);

      // Show user-friendly error message
      if (event.error === "not-allowed") {
        alert(
          "Microphone access denied. Please allow microphone access in your browser settings."
        );
      } else if (event.error === "no-speech") {
        alert("No speech detected. Please try again.");
      } else {
        alert(`Voice input error: ${event.error}`);
      }
    };

    // Handle end of recognition
    recognition.onend = () => {
      setIsRecording(false);
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!voiceSupported) {
      alert(
        "Voice input is not supported in your browser. Please use Chrome, Edge, or Safari."
      );
      return;
    }

    if (isLoading) {
      return; // Don't allow voice input while loading
    }

    if (isRecording) {
      // Stop recording
      recognitionRef.current?.stop();
      setIsRecording(false);
      setIsListening(false);
    } else {
      // Start recording
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
        setIsListening(true);
        setInputMessage(""); // Clear existing input
      } catch (error) {
        console.error("Error starting recognition:", error);
        alert("Could not start voice input. Please try again.");
        setIsRecording(false);
        setIsListening(false);
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputMessage.trim() || isLoading) {
      return;
    }

    const userMessageText = inputMessage.trim();

    // Add user message
    setMessages((prev) => [
      ...prev,
      { type: "user", content: userMessageText, id: Date.now() },
    ]);
    setInputMessage("");
    setIsLoading(true);

    // Add loading message
    setMessages((prev) => [
      ...prev,
      {
        type: "ai",
        content: "Searching the web and planning your trip...",
        isLoading: true,
        id: Date.now(),
      },
    ]);

    try {
      console.log("Sending message to API:", userMessageText);

      const response = await fetch("/api/trip-planner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userMessage: userMessageText,
          context: currentContext,
          conversationHistory: messages
            .filter((m) => m.type === "ai" && !m.isLoading)
            .map((m) => m.content)
            .join("\n"),
        }),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Success! Received data:", data);

      if (data.error) {
        throw new Error(data.error);
      }

      // Remove loading message
      setMessages((prev) => prev.filter((msg) => !msg.isLoading));

      // Add AI response with unique ID
      const aiMessage = {
        type: "ai",
        content:
          data.reply ||
          "I'm having trouble processing your request. Please try again.",
        sources: data.sources || [],
        id: Date.now(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Update context
      if (data.context) {
        setCurrentContext(data.context);
      }

      // Add follow-up question if needed
      if (data.needsFollowUp && data.followUpQuestion) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              type: "ai",
              content: data.followUpQuestion,
              isFollowUp: true,
              id: Date.now() + 1,
            },
          ]);
        }, 500);
      }
    } catch (error) {
      console.error("Error:", error);

      setMessages((prev) => prev.filter((msg) => !msg.isLoading));

      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
          isError: true,
          id: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-purple-50 to-blue-50">
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 hover:from-purple-200 hover:to-blue-200 transition-all duration-300 shadow-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5 mr-2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75"
              />
            </svg>
            Back to Home
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-blue-100 via-purple-100 to-blue-100 mb-4 shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 mr-2 text-purple-700"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
              />
            </svg>
            <span className="text-purple-800 font-semibold">
              AI Voice Assistant
            </span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Your AI Travel Assistant
          </h1>
          <p className="text-gray-600">
            <TypewriterEffect words={words} />
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 min-h-[600px] flex flex-col border border-purple-100">
          <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${
                  message.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                    message.type === "user"
                      ? "bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white"
                      : message.isError
                      ? "bg-red-50 border-red-200 border text-red-800"
                      : message.isLoading
                      ? "bg-gray-50 border-gray-200 border text-gray-600"
                      : "bg-gradient-to-r from-purple-50 to-blue-50 text-gray-900 border border-purple-100"
                  }`}
                >
                  {message.isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin h-4 w-4 border-2 border-purple-500 rounded-full border-t-transparent"></div>
                      <span>{message.content}</span>
                    </div>
                  ) : (
                    <div>
                      <div
                        className={`whitespace-pre-wrap ${
                          message.isFollowUp ? "font-semibold" : ""
                        }`}
                      >
                        {message.content}
                      </div>
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-purple-200">
                          <div className="text-xs font-semibold text-purple-700 mb-2">
                            Sources:
                          </div>
                          <div className="space-y-1">
                            {message.sources.map((source, idx) => (
                              <div
                                key={`${message.id}-${idx}`}
                                className="text-xs"
                              >
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 hover:underline flex items-start gap-1"
                                >
                                  <span className="font-medium">
                                    [{idx + 1}]
                                  </span>
                                  <span className="flex-1">{source.title}</span>
                                </a>
                                {source.snippet && (
                                  <p className="text-gray-600 ml-4 mt-0.5">
                                    {source.snippet}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isLoading || !voiceSupported}
              className={`p-3 rounded-full shadow-lg transition-all duration-300 ${
                isRecording
                  ? "bg-red-500 text-white animate-pulse"
                  : isLoading || !voiceSupported
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white hover:shadow-purple-200"
              }`}
              title={
                !voiceSupported
                  ? "Voice input not supported in this browser"
                  : isRecording
                  ? "Stop recording"
                  : "Start voice input"
              }
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                />
              </svg>
            </button>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
              placeholder={
                isRecording
                  ? "🎤 Listening..."
                  : isLoading
                  ? "Planning your trip..."
                  : "Type or speak your travel plans..."
              }
              className="flex-1 p-4 rounded-full border border-purple-200 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-purple-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="p-4 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white shadow-lg hover:shadow-purple-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin h-6 w-6 border-2 border-white rounded-full border-t-transparent"></div>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              )}
            </button>
          </form>

          {/* Voice status indicator */}
          {isRecording && (
            <div className="mt-2 text-center">
              <span className="text-sm text-purple-600 animate-pulse">
                🎤 Listening... Speak now!
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
