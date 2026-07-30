'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, AlertTriangle, Bot, Trash2 } from 'lucide-react';
import { useFloodStore } from '@/store/flood-store';
import { useState, useRef, useEffect, useCallback } from 'react';
import { severityColors } from '@/lib/mumbai-data';

export default function RAGTerminal() {
  const {
    ragPanelOpen, toggleRAGPanel, selectedWardId, selectedWard, timeIndex,
    ragMessages, addRAGMessage, isRAGLoading, setRAGLoading, clearRAGMessages,
    wardSeverities, criticalAlertVisible
  } = useFloodStore();

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ward = selectedWard();
  const severity = selectedWardId ? (wardSeverities[selectedWardId] ?? 0) : 0;

  const fetchAlert = useCallback(async () => {
    if (!selectedWardId) return;
    setRAGLoading(true);
    addRAGMessage({
      role: 'system',
      content: `Monitoring alert triggered for ${ward?.name || 'Unknown Ward'} — Severity Level ${severity}`,
    });
    try {
      const res = await fetch(`/api/rag-alert?XTransformPort=3000`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wardId: selectedWardId, timeIndex }),
      });
      const data = await res.json();
      addRAGMessage({ role: 'assistant', content: data.response });
    } catch {
      addRAGMessage({
        role: 'assistant',
        content: `Unable to reach LLM inference endpoint. Based on local analysis, Ward ${ward?.name} is at Severity ${severity}. Follow standard BMC monsoon protocol for this level.`
      });
    }
    setRAGLoading(false);
  }, [selectedWardId, timeIndex, ward?.name, severity, addRAGMessage, setRAGLoading]);

  const handleSend = async () => {
    if (!input.trim() || !selectedWardId) return;
    addRAGMessage({ role: 'user', content: input });
    setInput('');
    setRAGLoading(true);
    try {
      const res = await fetch(`/api/rag-alert?XTransformPort=3000`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wardId: selectedWardId, timeIndex, query: input }),
      });
      const data = await res.json();
      addRAGMessage({ role: 'assistant', content: data.response });
    } catch {
      addRAGMessage({
        role: 'assistant',
        content: 'Error connecting to inference service. Please try again.'
      });
    }
    setRAGLoading(false);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ragMessages]);

  // Auto-trigger alert when severity 3
  useEffect(() => {
    if (criticalAlertVisible && ward && ragMessages.length === 0) {
      fetchAlert();
    }
  }, [criticalAlertVisible, selectedWardId, fetchAlert, ward, ragMessages.length]);

  return (
    <>
      {/* Toggle button */}
      {!ragPanelOpen && (
        <motion.button
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 25, delay: 0.4 }}
          onClick={toggleRAGPanel}
          className="absolute top-5 right-5 z-20 mt-[90px]"
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'rgba(12, 14, 20, 0.88)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <MessageSquare size={16} className="text-white/70" />
          </div>
        </motion.button>
      )}

      {/* Terminal panel */}
      <AnimatePresence>
        {ragPanelOpen && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="absolute right-0 top-0 bottom-0 z-20 w-[400px]"
            style={{ pointerEvents: 'auto' }}
          >
            <div
              className="h-full flex flex-col"
              style={{
                background: 'rgba(12, 14, 20, 0.92)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderLeft: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
                <div className="flex items-center gap-2">
                  <Bot size={15} className="text-[#D4A853]" />
                  <div>
                    <h2 className="text-[13px] font-semibold text-white">Emergency Terminal</h2>
                    <p className="text-[10px] text-white/35">LLM-Powered Protocol Generator</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={clearRAGMessages}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                    title="Clear"
                  >
                    <Trash2 size={12} className="text-white/40" />
                  </button>
                  <button
                    onClick={toggleRAGPanel}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                  >
                    <X size={12} className="text-white/40" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
                {ragMessages.length === 0 && (
                  <div className="text-center py-12">
                    <AlertTriangle size={28} className="text-white/10 mx-auto mb-3" />
                    <p className="text-xs text-white/25 mb-1">No active alerts</p>
                    <p className="text-[10px] text-white/15">Select a ward and adjust the timeline to generate emergency protocols.</p>
                  </div>
                )}
                {ragMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`${
                      msg.role === 'user'
                        ? 'ml-8 bg-white/5 rounded-xl px-3 py-2 border border-white/6'
                        : msg.role === 'system'
                        ? 'bg-[#D4A853]/8 rounded-xl px-3 py-2 border border-[#D4A853]/15'
                        : ''
                    }`}
                  >
                    {msg.role === 'system' && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle size={10} className="text-[#D4A853]" />
                        <span className="text-[10px] font-semibold text-[#D4A853]">SYSTEM ALERT</span>
                      </div>
                    )}
                    {msg.role === 'assistant' && msg.content.includes('CRITICAL') && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-semibold text-red-400">CRITICAL PROTOCOL</span>
                      </div>
                    )}
                    {msg.role === 'assistant' && msg.content.includes('WARNING') && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        <span className="text-[10px] font-semibold text-orange-400">WARNING</span>
                      </div>
                    )}
                    <p className="text-[12px] leading-relaxed text-white/70 whitespace-pre-line">{msg.content}</p>
                  </motion.div>
                ))}
                {isRAGLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 px-3 py-2"
                  >
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[11px] text-white/30">Generating protocol...</span>
                  </motion.div>
                )}
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-white/6">
                {ward ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder={`Ask about ${ward.name}...`}
                      className="flex-1 bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-[12px] text-white/80 placeholder-white/25 outline-none focus:border-[#D4A853]/40 transition-colors"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className="w-8 h-8 rounded-lg bg-[#D4A853]/15 hover:bg-[#D4A853]/25 flex items-center justify-center transition-colors disabled:opacity-30"
                    >
                      <Send size={13} className="text-[#D4A853]" />
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-white/25 text-center">Select a ward to enable emergency queries</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
