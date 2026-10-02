'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, X, Send, AlertTriangle, Trash2, Copy, Check, 
  Sparkles, ShieldAlert, Activity, ChevronRight, Terminal as TerminalIcon
} from 'lucide-react';
import { useFloodStore } from '@/store/flood-store';

interface FormattedBlockProps {
  content: string;
}

function FormattedProtocol({ content }: FormattedBlockProps) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let currentSection: 'situation' | 'drivers' | 'directives' | 'general' = 'general';

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={`spacer-${idx}`} className="h-2" />);
      return;
    }

    // Section Headers
    if (trimmed.startsWith('###')) {
      const headerText = trimmed.replace(/^###\s*/, '');
      const isSituation = headerText.includes('SITUATION');
      const isDrivers = headerText.includes('HYDROLOGIC') || headerText.includes('DRIVERS');
      const isDirectives = headerText.includes('TACTICAL') || headerText.includes('DIRECTIVES');

      if (isSituation) currentSection = 'situation';
      else if (isDrivers) currentSection = 'drivers';
      else if (isDirectives) currentSection = 'directives';
      else currentSection = 'general';

      const borderClass = isSituation
        ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
        : isDrivers
        ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10'
        : isDirectives
        ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
        : 'border-white/20 text-white bg-white/5';

      elements.push(
        <div key={`header-${idx}`} className="mt-3.5 mb-2">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[11px] font-mono font-bold uppercase tracking-wider ${borderClass}`}>
            <span>{headerText}</span>
          </div>
        </div>
      );
      return;
    }

    // Commander's Note Highlight Box
    if (trimmed.startsWith('**Commander’s Note:**') || trimmed.startsWith("**Commander's Note:**")) {
      const noteText = trimmed.replace(/^\*\*Commander[’']s Note:\*\*\s*/, '');
      elements.push(
        <div key={`cmd-note-${idx}`} className="my-3 p-3 rounded-xl bg-emerald-500/[0.08] border-l-2 border-emerald-400 text-xs text-emerald-200">
          <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1">
            <ShieldAlert size={12} />
            Commander’s Field Directive
          </div>
          <p className="leading-relaxed font-satoshi font-medium">{noteText}</p>
        </div>
      );
      return;
    }

    // Numbered Directives (1. 2. 3.)
    const numMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
    if (numMatch) {
      const num = numMatch[1];
      const rawBody = numMatch[2];

      elements.push(
        <div key={`num-${idx}`} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-colors mb-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold shrink-0 mt-0.5">
            {num}
          </span>
          <div className="flex-1 text-[11.5px] leading-relaxed text-gray-300">
            <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(rawBody) }} />
          </div>
        </div>
      );
      return;
    }

    // Bullet Items (* or -)
    if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
      const bulletBody = trimmed.replace(/^[\*\-]\s*/, '');
      elements.push(
        <div key={`bullet-${idx}`} className="flex items-start gap-2 py-1 px-1 text-[11.5px] text-gray-300 leading-relaxed">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <div className="flex-1" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(bulletBody) }} />
        </div>
      );
      return;
    }

    // Regular Paragraph
    elements.push(
      <p 
        key={`p-${idx}`} 
        className="text-[12px] leading-relaxed text-gray-300 font-satoshi"
        dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed) }}
      />
    );
  });

  return <div className="space-y-1">{elements}</div>;
}

function formatInlineMarkdown(text: string): string {
  // Convert **bold** to styled span
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white tracking-wide">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-gray-400 italic">$1</em>');
}

export default function RAGTerminal() {
  const {
    ragPanelOpen, toggleRAGPanel, selectedWardId, selectedWard, timeIndex,
    ragMessages, addRAGMessage, isRAGLoading, setRAGLoading, clearRAGMessages,
    wardSeverities, criticalAlertVisible, getWardRiskProfile
  } = useFloodStore();

  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ward = selectedWard();
  const severity = selectedWardId ? (wardSeverities[selectedWardId] ?? 0) : 0;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchAlert = useCallback(async () => {
    if (!selectedWardId) return;
    setRAGLoading(true);
    addRAGMessage({
      role: 'system',
      content: `Alert initiated for ${ward?.name || 'Selected Ward'} — Severity ${severity}/3`,
    });
    try {
      const profile = getWardRiskProfile(selectedWardId);
      if (!profile) {
        addRAGMessage({ role: 'assistant', content: `No telemetry available for this ward yet. Telemetry still streaming.` });
        setRAGLoading(false);
        return;
      }
      const res = await fetch(`/api/rag-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      addRAGMessage({ role: 'assistant', content: data.error || data.response });
    } catch {
      addRAGMessage({
        role: 'assistant',
        content: `Emergency inference endpoint offline. Ward ${ward?.name} is at Severity ${severity}. Maintain standard BMC monsoon protocol.`,
      });
    }
    setRAGLoading(false);
  }, [selectedWardId, timeIndex, ward?.name, severity, addRAGMessage, setRAGLoading, getWardRiskProfile]);

  const sendQuery = async (queryText: string) => {
    if (!queryText.trim() || !selectedWardId) return;
    addRAGMessage({ role: 'user', content: queryText });
    setInput('');
    setRAGLoading(true);
    try {
      const profile = getWardRiskProfile(selectedWardId);
      const res = await fetch(`/api/rag-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, query: queryText }),
      });
      const data = await res.json();
      addRAGMessage({ role: 'assistant', content: data.error || data.response });
    } catch {
      addRAGMessage({ role: 'assistant', content: 'Connection failure to municipal tactical assistant.' });
    }
    setRAGLoading(false);
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [ragMessages]);

  useEffect(() => {
    if (criticalAlertVisible && ward && ragMessages.length === 0) fetchAlert();
  }, [criticalAlertVisible, selectedWardId, fetchAlert, ward, ragMessages.length]);

  const QUICK_PROMPTS = [
    { label: '⏱️ Inundation ETA', query: 'What is the estimated time to threshold or inundation for this ward?' },
    { label: '🚜 Dewatering Plan', query: 'What is the recommended pumping station and dewatering plan?' },
    { label: '📜 Historical Analogue', query: 'How do current conditions compare to the worst historical flood event here?' },
    { label: '🚨 Escalation Triggers', query: 'What specific trigger conditions would escalate this ward to the next severity level?' },
  ];

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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#0B0D14]/90 backdrop-blur-xl border border-white/10 hover:border-white/30 text-white shadow-xl hover:scale-105 transition-all">
            <MessageSquare size={16} className="text-[#10B981]" />
          </div>
        </motion.button>
      )}

      <AnimatePresence>
        {ragPanelOpen && (
          <motion.div
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute right-0 top-0 bottom-0 z-20 w-[420px]"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="h-full flex flex-col bg-[#080A0F]/95 backdrop-blur-2xl border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
              
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                    <TerminalIcon size={14} className="text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-[13px] font-bold font-clash text-white tracking-tight flex items-center gap-2">
                      Emergency Terminal
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </h2>
                    <p className="text-[10px] text-gray-400 font-mono">Tactical Protocol Generator</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={clearRAGMessages} 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    title="Clear history"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button 
                    onClick={toggleRAGPanel} 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    title="Close terminal"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Message Feed */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
                {ragMessages.length === 0 && (
                  <div className="text-center py-16 px-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto mb-3">
                      <Sparkles size={20} className="text-emerald-400" />
                    </div>
                    <p className="text-[13px] font-semibold text-white font-clash">EOC Tactical Intelligence</p>
                    <p className="text-[11px] text-gray-400 font-satoshi mt-1 max-w-[240px] mx-auto leading-relaxed">
                      Select a ward pin on the map and click <strong className="text-white">Generate Plain-Language Alert</strong> to produce a tactical emergency protocol.
                    </p>
                  </div>
                )}

                {ragMessages.map((msg) => (
                  <motion.div 
                    key={msg.id} 
                    initial={{ opacity: 0, y: 8 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="space-y-1"
                  >
                    {msg.role === 'user' ? (
                      <div className="ml-10 bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-2.5 text-[12px] text-white font-satoshi">
                        <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block mb-0.5">You</span>
                        {msg.content}
                      </div>
                    ) : msg.role === 'system' ? (
                      <div className="bg-emerald-500/[0.06] border border-emerald-500/20 rounded-xl px-3.5 py-2 text-[11px] text-emerald-300 font-mono flex items-center gap-2">
                        <Activity size={12} className="text-emerald-400 animate-pulse shrink-0" />
                        <span>{msg.content}</span>
                      </div>
                    ) : (
                      /* Assistant Tactical Protocol Card */
                      <div className="rounded-2xl bg-[#0D1017] border border-white/10 p-4 shadow-xl relative group">
                        {/* Protocol Header */}
                        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/5 text-[10px] font-mono">
                          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold tracking-wider">
                            <Sparkles size={11} />
                            <span>MUNICIPAL TACTICAL PROTOCOL</span>
                          </div>

                          <button
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check size={11} className="text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Protocol Body */}
                        <FormattedProtocol content={msg.content} />
                      </div>
                    )}
                  </motion.div>
                ))}

                {isRAGLoading && (
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[11px] text-emerald-400 font-mono tracking-wider">Synthesizing Tactical Briefing...</span>
                  </div>
                )}
              </div>

              {/* Quick Prompt Chips */}
              {ward && (
                <div className="px-5 py-2 border-t border-white/5 bg-white/[0.01]">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                    {QUICK_PROMPTS.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendQuery(chip.query)}
                        disabled={isRAGLoading}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/[0.05] text-[10px] text-gray-300 hover:text-white transition-all whitespace-nowrap font-mono shrink-0 cursor-pointer disabled:opacity-40"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="px-5 py-3.5 border-t border-white/10 bg-white/[0.02]">
                {ward ? (
                  <div className="flex items-center gap-2">
                    <input 
                      ref={inputRef} 
                      type="text" 
                      value={input} 
                      onChange={(e) => setInput(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && sendQuery(input)} 
                      placeholder={`Query protocol for ${ward.name}...`} 
                      className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-[12px] text-white placeholder-gray-500 outline-none focus:border-emerald-500/50 transition-colors font-satoshi" 
                    />
                    <button 
                      onClick={() => sendQuery(input)} 
                      disabled={!input.trim() || isRAGLoading} 
                      className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-30 cursor-pointer shrink-0"
                    >
                      <Send size={13} />
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500 font-mono text-center py-1">Select a ward to enable tactical queries</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
