import React from "react";
import { FlipWords } from "./ui/flip-words";

export default function Hero() {
  const words = ["AI Voice Assistant", "Smart Travel AI", "Voice-Powered AI"];

  return (
    <div className="text-center max-w-4xl mx-auto">
      {/* Badge */}
      <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 font-medium mb-8">
        ✨ Powered by Advanced AI
      </div>
      
      {/* Main Heading */}
      <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
        <div>Plan Your Dream Trip with</div>
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          <FlipWords words={words} />
        </div>
      </h1>
      
      {/* Subtitle */}
      <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto">
        Just speak your travel desires and watch as AI crafts personalized itineraries with real-time data and transparent sources
      </p>
      
      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
        <a href="/chat" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center space-x-2">
          <span>Get Started</span>
        </a>
      </div>
    </div>
  );
}