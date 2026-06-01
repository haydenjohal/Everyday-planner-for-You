/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Brain, Clock, Calendar, Image, X, AlertCircle } from "lucide-react";
import { PlannerItem } from "../types";

interface ChatMessage {
  id: string;
  sender: "user" | "planmate";
  text: string;
  image?: string; // base64 representation if sent
}

interface PlanMateChatProps {
  currentSchedule: PlannerItem[];
}

interface ImagePayload {
  data: string;
  mimeType: string;
  name: string;
}

export const PlanMateChat: React.FC<PlanMateChatProps> = ({ currentSchedule }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedImage, setSelectedImage] = useState<ImagePayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with schedule-aware friendly greeting
  useEffect(() => {
    const totalCustoms = currentSchedule.filter(i => i.type === "custom").length;
    const totalTasks = currentSchedule.length;
    let greeting = "Hey there! I'm **PlanMate**, your personal AI scheduler assistant. 🧠\n\nI have loaded your planner database containing **" + totalTasks + " scheduled items**";
    if (totalCustoms > 0) {
      greeting += " (including your **" + totalCustoms + " special milestones/custom dates**)!";
    } else {
      greeting += "!";
    }
    
    greeting += "\n\nAsk me anything! You can ask queries about your calendar or **upload an image** (like a screenshot of your homework list, a workout routine sheet, or a picture of an schedule) and I will extract the tasks directly into advice for your week!";
    
    setMessages([
      {
        id: "initial-greeting",
        sender: "planmate",
        text: greeting
      }
    ]);
  }, [currentSchedule]);

  // Auto scroll to latest bubble on message list update or load state
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isLoading]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 12 * 1024 * 1024) {
        alert("This image is too large! Please choose an image smaller than 12MB.");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage({
          data: reader.result as string,
          mimeType: file.type,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() && !selectedImage) return;
    if (isLoading) return;

    const currentText = textToSend.trim();
    const currentImg = selectedImage;

    // Clear inputs immediately for Snappy UX
    setInputValue("");
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    const userMessageId = `user-${Date.now()}`;
    const newUserMessage: ChatMessage = {
      id: userMessageId,
      sender: "user",
      text: currentText || "Analyzed attached image file",
      image: currentImg?.data
    };

    // Append user message to chat state
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Structure fetch call to backend mentor endpoint
      const response = await fetch("/api/planner/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentText,
          image: currentImg ? { data: currentImg.data, mimeType: currentImg.mimeType } : undefined,
          history: updatedMessages.slice(-10).map(m => ({ 
            role: m.sender === "user" ? "user" : "model", 
            text: m.text 
          })),
          currentSchedule: currentSchedule
        })
      });

      const data = await response.json();
      
      setMessages(prev => [
        ...prev, 
        { 
          id: `planmate-${Date.now()}`,
          sender: "planmate", 
          text: data.reply || "Got it! Feel free to ask more scheduling questions." 
        }
      ]);
    } catch (err) {
      console.error("Mentor network error:", err);
      setMessages(prev => [
        ...prev,
        {
          id: `planmate-error-${Date.now()}`,
          sender: "planmate",
          text: "Oops, some signals got crossed! But here's a smart tip: **Break your big goals into 30-minute blocks** and complete high-priority assignments first! You got this!"
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const QUICK_PROMPTS = [
    "Summarize my upcoming events",
    "Do I have any double-bookings?",
    "Give me tips to find study habits",
    "How do I balance work with sports?"
  ];

  // Helper to safely replace markdown bold syntax "**" with <strong> tags, and handles bullets "-"
  const renderFormattedText = (rawText: string) => {
    return rawText.split("\n").map((line, lineIdx) => {
      let isBullet = false;
      let displayLine = line;
      if (line.trim().startsWith("- ")) {
        isBullet = true;
        displayLine = line.trim().substring(2);
      }

      const parts = displayLine.split(/\*\*([^*]+)\*\*/g);
      const renderedContent = parts.map((part, index) => {
        if (index % 2 === 1) {
          return <strong key={index} className="font-extrabold text-slate-900">{part}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={lineIdx} className="ml-5 list-disc mt-1.5 text-slate-700 leading-relaxed text-sm">
            {renderedContent}
          </li>
        );
      }

      return (
        <p key={lineIdx} className="mt-1 leading-relaxed text-slate-700 text-sm">
          {renderedContent}
        </p>
      );
    });
  };

  return (
    <div className="w-full h-[calc(100vh-200px)] min-h-[600px] flex flex-col bg-slate-50 rounded-2xl border border-slate-205 overflow-hidden shadow-sm" id="planmate-chat-tab-section">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 select-none shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-serif font-black text-lg shadow-sm">
            P
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>PlanMate Chat</span>
              <Sparkles className="w-4 h-4 text-indigo-500 fill-indigo-100 animate-pulse" />
            </h2>
            <p className="text-xs text-slate-400 font-medium">Your schedule companion & visual analyzer</p>
          </div>
        </div>

        {/* Quick summary status tags for screen presence */}
        <div className="hidden md:flex items-center gap-3">
          <div className="text-right">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Loaded Database</span>
            <span className="text-xs font-extrabold text-slate-700">{currentSchedule.length} active planner items</span>
          </div>
        </div>
      </div>

      {/* Main scrollable chat container */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin bg-gradient-to-b from-white to-slate-50/50" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
              <div className="flex gap-3 max-w-[85%]">
                {m.sender !== "user" && (
                  <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0 font-bold text-xs select-none shadow-3xs mt-1">
                    P
                  </div>
                )}
                <div
                  className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-3xs ${
                    m.sender === "user"
                      ? "bg-slate-900 text-white rounded-tr-xs"
                      : "bg-white border border-slate-200 text-slate-800 rounded-tl-xs"
                  }`}
                >
                  {/* Attached user visual representation if any */}
                  {m.image && (
                    <div className="mb-2.5 rounded-lg overflow-hidden border border-slate-200/20 max-w-sm">
                      <img src={m.image} alt="Uploaded source" className="max-h-[220px] object-contain w-auto rounded-md" />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {renderFormattedText(m.text)}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0 font-bold text-xs select-none shadow-3xs mt-1">
                  P
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-5 py-4 flex items-center gap-1.5 shadow-3xs">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Static Fixed bottom input tray container */}
      <div className="bg-white border-t border-slate-200 p-4 shrink-0">
        <div className="max-w-3xl mx-auto space-y-3">
          
          {/* pre-send image upload thumbnail preview block */}
          {selectedImage && (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between animate-fade-in shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-lg border border-slate-300 overflow-hidden shadow-3xs bg-white">
                  <img src={selectedImage.data} alt="Visual Attachment Preview" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 truncate max-w-[220px]">{selectedImage.name}</p>
                  <p className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Gemini multimodal vision enabled</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearSelectedImage}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                title="Discard attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Prompt chips suggestions */}
          {!selectedImage && messages.length <= 2 && (
            <div className="flex gap-2 overflow-x-auto pb-1 items-center whitespace-nowrap scrollbar-none select-none">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  id={`quick-query-prompt-${idx}`}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isLoading}
                  className="text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-indigo-650 hover:text-white border border-slate-200/80 rounded-full px-3.5 py-1.5 transition-all cursor-pointer shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Real Input Controls Panel */}
          <div className="flex items-center gap-3 relative bg-slate-50 border border-slate-250 rounded-2xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            
            {/* Native file upload with custom visual trigger label */}
            <label 
              htmlFor="planmate-image-upload-trigger" 
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-white cursor-pointer transition-all shrink-0 flex items-center justify-center border border-transparent shadow-none hover:border-slate-200/60"
              title="Attach image"
            >
              <Image className="w-5 h-5" />
              <input
                id="planmate-image-upload-trigger"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
                disabled={isLoading}
              />
            </label>

            <input
              id="planmate-chat-input"
              type="text"
              placeholder="Ask PlanMate or attach homework screenshots, workouts, timetables..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(inputValue);
                }
              }}
              disabled={isLoading}
              className="flex-1 bg-transparent border-none text-sm placeholder-slate-400 focus:outline-none focus:ring-0 font-medium text-slate-800"
            />

            <button
              id="send-planmate-chat"
              onClick={() => handleSendMessage(inputValue)}
              disabled={isLoading || (!inputValue.trim() && !selectedImage)}
              className={`p-2.5 rounded-xl transition-all shrink-0 ${
                (inputValue.trim() || selectedImage) && !isLoading
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95 shadow-sm"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
