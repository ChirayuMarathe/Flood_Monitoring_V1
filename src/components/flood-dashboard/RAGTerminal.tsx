'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, AlertTriangle, Bot, Trash2 } from 'lucide-react';
import { useFloodStore } from '@/store/flood-store';
import { useState, useRef, useEffect, useCallback } from 'react';

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
      content: `Alert triggered for ${ward?.name || 'Unknown Ward'} — Severity Level ${severity}`,
    });
    try {
      const res = await fetch(`/api/rag-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wardId: selectedWardId, timeIndex }),
      });
      const data = await res.json();
      addRAGMessage({ role: 'assistant', content: data.response });
    } catch {
      addRAGMessage({
        role: 'assistant',
        content: `Unable to reach inference endpoint. Ward ${ward?.name} is at Severity ${severity}. Follow standard BMC monsoon protocol.`,
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
      const res = await fetch(`/api/rag-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wardId: selectedWardId, timeIndex, query: input }),
      });
      const data = await res.json();
      addRAGMessage({ role: 'assistant', content: data.response });
    } catch {
      addRAGMessage({ role: 'assistant', content: 'Error connecting to inference service.' });
    }
    setRAGLoading(false);
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [ragMessages]);

  useEffect(() => {
    if (criticalAlertVisible && ward && ragMessages.length === 0) fetchAlert();
  }, [criticalAlertVisible, selectedWardId, fetchAlert, ward, ragMessages.length]);

  return (
    <>
      {!ragPanelOpen && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          onClick={toggleRAGPanel}
          className="absolute top-4 right-4 z-20 mt-[72px]"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#13161D] border border-[#242832] hover:bg-[#1A1E27] transition-colors">
            <MessageSquare size={14} className="text-[#8B919E]" />
          </div>
        </motion.button>
      )}

      <AnimatePresence>
        {ragPanelOpen && (
          <motion.div
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-0 bottom-0 z-20 w-[380px]"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="h-full flex flex-col bg-[#0F1117] border-l border-[#242832]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1A1E27]">
                <div>
                  <h2 className="text-[13px] font-semibold text-[#E1E4EA]">Emergency Terminal</h2>
                  <p className="text-[10px] text-[#525866]">Protocol Generator</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={clearRAGMessages} className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#1A1E27] transition-colors"><Trash2 size={12} className="text-[#525866]" /></button>
                  <button onClick={toggleRAGPanel} className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#1A1E27] transition-colors"><X size={12} className="text-[#525866]" /></button>
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
                {ragMessages.length === 0 && (
                  <div className="text-center py-12">
                    <AlertTriangle size={24} className="text-[#242832] mx-auto mb-3" />
                    <p className="text-[11px] text-[#525866]">No active alerts</p>
                    <p className="text-[10px] text-[#525866]/60 mt-1">Select a ward and adjust the timeline.</p>
                  </div>
                )}
                {ragMessages.map((msg) => (
                  <motion.div key={msg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={
                    msg.role === 'user' ? 'ml-8 bg-[#1A1E27] rounded-lg px-3 py-2 border border-[#242832]'
                    : msg.role === 'system' ? 'bg-[#5B8DEF]/5 rounded-lg px-3 py-2 border border-[#5B8DEF]/10'
                    : ''
                  }>
                    {msg.role === 'system' && <div className="flex items-center gap-1.5 mb-1"><span className="text-[9px] font-semibold text-[#5B8DEF] uppercase tracking-wider">System</span></div>}
                    <p className="text-[12px] leading-relaxed text-[#C1C5CD] whitespace-pre-line">{msg.content}</p>
                  </motion.div>
                ))}
                {isRAGLoading && (
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#525866] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#525866] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#525866] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[10px] text-[#525866]">Generating...</span>
                  </div>
                )}
              </div>
              <div className="px-4 py-3 border-t border-[#1A1E27]">
                {ward ? (
                  <div className="flex items-center gap-2">
                    <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={`Ask about ${ward.name}...`} className="flex-1 bg-[#13161D] border border-[#242832] rounded-lg px-3 py-2 text-[12px] text-[#E1E4EA] placeholder-[#525866] outline-none focus:border-[#5B8DEF]/30 transition-colors" />
                    <button onClick={handleSend} disabled={!input.trim()} className="w-8 h-8 rounded-lg bg-[#1A1E27] border border-[#242832] flex items-center justify-center hover:bg-[#242832] transition-colors disabled:opacity-30"><Send size={12} className="text-[#8B919E]" /></button>
                  </div>
                ) : (
                  <p className="text-[10px] text-[#525866] text-center">Select a ward to enable queries</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
