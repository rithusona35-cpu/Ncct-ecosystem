'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { sendChatMessage, ChatbotMessageResponse } from '../lib/api';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  intent?: string;
  is_fallback?: boolean;
  timestamp: string;
}

export default function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your NCCT Cooperative Training Assistant. You can ask me about your attendance, module progress, skill gaps, career opportunities, certificates, training schedule, or educational topics like "Explain cooperative accounting" or "What is PACS?".',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasFallbackMessage, setHasFallbackMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  const pathname = usePathname();

  // Show on all trainee pages or whenever a trainee user is logged in
  const isTraineeContext = user?.role === 'TRAINEE' || (pathname && pathname.startsWith('/trainee'));
  if (!user || !isTraineeContext) {
    return null;
  }

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res: ChatbotMessageResponse = await sendChatMessage(text);
      if (res.is_fallback) {
        setHasFallbackMessage(true);
      }
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: res.response,
        intent: res.intent,
        is_fallback: res.is_fallback,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'assistant',
        text: `Error connecting to assistant: ${err.message || 'Please verify your network or try again.'}`,
        is_fallback: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setHasFallbackMessage(true);
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    'What is my attendance?',
    'Explain cooperative accounting',
    'What is PACS?',
    'What are my skill gaps?',
    'When is my class schedule?',
  ];

  const formatIntentName = (intent?: string) => {
    if (!intent) return '';
    switch (intent) {
      case 'progress_query':
        return 'Attendance & Progress';
      case 'learning_question':
        return 'Knowledge Base (RAG)';
      case 'skill_gap_query':
        return 'Skill Analysis';
      case 'career_query':
        return 'Job Match';
      case 'certificate_query':
        return 'Digital Credentials';
      case 'training_schedule_query':
        return 'Schedule';
      default:
        return 'Assistant';
    }
  };

  return (
    <div id="ncct-chat-widget-container" className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Collapsed Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          id="ncct-chat-open-btn"
          data-testid="ncct-chat-open-btn"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white px-5 py-3.5 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-emerald-400/50 cursor-pointer"
          aria-label="Open NCCT AI Assistant"
        >
          <div className="relative">
            <svg
              className="w-6 h-6 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-300"></span>
            </span>
          </div>
          <span className="font-semibold text-sm tracking-wide hidden sm:inline">
            Ask NCCT Assistant
          </span>
          {hasFallbackMessage && (
            <span className="bg-amber-400 text-amber-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase">
              Offline
            </span>
          )}
        </button>
      )}

      {/* Expanded Chat Window */}
      {isOpen && (
        <div
          id="ncct-chat-window"
          className="flex flex-col w-[360px] sm:w-[420px] h-[580px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-indigo-800 text-white px-4 py-3.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center border border-white/20 shadow-inner">
                <svg
                  className="w-5 h-5 text-emerald-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm tracking-tight leading-tight">
                    NCCT AI Assistant
                  </h3>
                  {hasFallbackMessage ? (
                    <span
                      id="header-offline-badge"
                      className="bg-amber-400 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-800 animate-pulse"></span>
                      Offline Mode
                    </span>
                  ) : (
                    <span className="bg-emerald-500/30 text-emerald-200 text-[10px] font-medium px-2 py-0.5 rounded-full border border-emerald-400/30">
                      Gemini + RAG
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-emerald-100/80 leading-none mt-0.5">
                  Cooperative Training & Intelligence
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                id="ncct-chat-close-btn"
                data-testid="ncct-chat-close-btn"
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                title="Minimize chat"
                aria-label="Close chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick Prompts Banner */}
          <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap pl-1">
              Quick:
            </span>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                disabled={isLoading}
                className="whitespace-nowrap bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 px-2.5 py-1 rounded-full text-[11px] transition-colors shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 bg-slate-100/50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs text-xs sm:text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-br-xs'
                      : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-xs'
                  }`}
                >
                  {/* Assistant Meta Header */}
                  {m.sender === 'assistant' && (m.intent || m.is_fallback) && (
                    <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-slate-100">
                      {m.intent && (
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.2 rounded-full uppercase tracking-wider">
                          {formatIntentName(m.intent)}
                        </span>
                      )}
                      {m.is_fallback && (
                        <span
                          data-testid="offline-mode-badge"
                          className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.2 rounded-full uppercase tracking-wider flex items-center gap-1"
                        >
                          <svg className="w-2.5 h-2.5 text-amber-700" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Offline Mode
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>

                {/* Timestamp */}
                <span className="text-[10px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 p-2 max-w-[70%] bg-white rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex space-x-1 pl-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium pr-1">
                  NCCT Assistant is typing...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-200">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                id="ncct-chat-input"
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about attendance, PACS, cooperative law..."
                disabled={isLoading}
                className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all placeholder:text-slate-400"
              />
              <button
                type="button"
                id="ncct-chat-send-btn"
                data-testid="ncct-chat-send-btn"
                onClick={() => handleSend()}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-xl shadow-xs transition-colors flex items-center justify-center cursor-pointer"
                aria-label="Send message"
              >
                <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 px-1">
              <span>Enter to send</span>
              <span>NCCT RAG & Gemini Assistant</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
