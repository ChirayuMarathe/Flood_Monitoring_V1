'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, X, Send, AlertTriangle, Trash2, Copy, Check, 
  Sparkles, ShieldAlert, Activity, ChevronRight, Terminal as TerminalIcon,
  MapPin, Info
} from 'lucide-react';
import { useFloodStore } from '@/store/flood-store';
import { WardRiskPopup } from './WardRiskPopup';

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
        ? 'border-white/40 text-white bg-white/10'
        : isDrivers
        ? 'border-white/30 text-zinc-200 bg-white/[0.08]'
        : isDirectives
        ? 'border-white/25 text-zinc-300 bg-white/[0.06]'
        : 'border-white/20 text-zinc-400 bg-white/5';

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
        <div key={`cmd-note-${idx}`} className="my-3 p-3 rounded-xl bg-white/[0.04] border-l-2 border-white text-xs text-zinc-200">
          <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-white mb-1 flex items-center gap-1">
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
          <span className="flex items-center justify-center w-5 h-5 rounded-md bg-white/15 border border-white/30 text-white font-mono text-[10px] font-bold shrink-0 mt-0.5">
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
          <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 mt-1.5 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
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
    wardSeverities, criticalAlertVisible, getWardRiskProfile, activeCity
  } = useFloodStore();

  const [activeTab, setActiveTab] = useState<'knowledge' | 'protocol'>('knowledge');
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ward = selectedWard();
  const severity = selectedWardId ? (wardSeverities[selectedWardId] ?? 0) : 0;
  const profile = selectedWardId ? getWardRiskProfile(selectedWardId) : null;

  // When a user selects a ward, switch to Ward Intelligence tab
  useEffect(() => {
    if (selectedWardId) {
      setActiveTab('knowledge');
    }
  }, [selectedWardId]);

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
      const p = getWardRiskProfile(selectedWardId);
      if (!p) {
        addRAGMessage({ role: 'assistant', content: `No telemetry available for this ward yet. Telemetry still streaming.` });
        setRAGLoading(false);
        return;
      }
      const res = await fetch(`/api/rag-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
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
      const p = getWardRiskProfile(selectedWardId);
      const res = await fetch(`/api/rag-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: p, query: queryText }),
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
    if (criticalAlertVisible && ward && ragMessages.length === 0) {
      setActiveTab('protocol');
      fetchAlert();
    }
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
          className="fixed top-4 right-4 z-30 mt-[72px]"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#0B0D14]/90 backdrop-blur-xl border border-white/10 hover:border-white/30 text-white shadow-xl hover:scale-105 transition-all">
            <MessageSquare size={16} className="text-white" />
          </div>
        </motion.button>
      )}

      <AnimatePresence>
        {ragPanelOpen && (
          <motion.div
            initial={{ x: 440, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 440, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed right-0 top-0 bottom-0 z-30 w-[420px]"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="h-full flex flex-col bg-[#080A0F]/95 backdrop-blur-2xl border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
              
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                    <TerminalIcon size={14} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-[13px] font-bold font-clash text-white tracking-tight flex items-center gap-2">
                      Emergency Terminal
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    </h2>
                    <p className="text-[10px] text-gray-400 font-mono">Tactical Protocol & Intelligence</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {activeTab === 'protocol' && ragMessages.length > 0 && (
                    <button 
                      onClick={clearRAGMessages} 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                      title="Clear history"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  <button 
                    onClick={toggleRAGPanel} 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    title="Close terminal"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Segmented Tab Switcher */}
              <div className="flex items-center px-4 py-2 border-b border-white/10 bg-white/[0.01] gap-2">
                <button
                  onClick={() => setActiveTab('knowledge')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-[11px] font-mono transition-all cursor-pointer ${
                    activeTab === 'knowledge'
                      ? 'bg-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Activity size={12} />
                  <span>Ward Intelligence</span>
                  {ward && (
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      severity === 3 ? 'bg-black animate-ping' : 'bg-black/60'
                    }`} />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('protocol')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-[11px] font-mono transition-all cursor-pointer ${
                    activeTab === 'protocol'
                      ? 'bg-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <TerminalIcon size={12} />
                  <span>Tactical Protocol</span>
                  {ragMessages.length > 0 && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeTab === 'protocol' ? 'bg-black text-white' : 'bg-white/15 text-white'
                    }`}>
                      {ragMessages.length}
                    </span>
                  )}
                </button>
              </div>

              {/* TAB 1: Ward Intelligence (Fixed Ward Knowledge Card) */}
              {activeTab === 'knowledge' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {profile ? (
                    <WardRiskPopup
                      profile={profile}
                      variant="docked"
                      isLoadingAI={isRAGLoading}
                      onRequestAIExplanation={() => {
                        setActiveTab('protocol');
                        fetchAlert();
                      }}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-4">
                        <MapPin size={24} className="text-zinc-400" />
                      </div>
                      <h3 className="text-sm font-bold font-clash text-white mb-1.5">No Ward Selected</h3>
                      <p className="text-xs text-zinc-400 max-w-[260px] leading-relaxed">
                        Click any ward boundary on the 3D map to view its active risk factors, live telemetry, and historical analogue.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Tactical Protocol Terminal */}
              {activeTab === 'protocol' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Contextual Ward Bar */}
                  {ward && (
                    <div className="px-5 py-2 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white font-clash">{ward.name}</span>
                        <span className="text-[10px] font-mono text-zinc-400 uppercase">{activeCity.replace('_', ' ')}</span>
                      </div>
                      <button
                        onClick={() => setActiveTab('knowledge')}
                        className="text-[10px] font-mono text-zinc-300 hover:text-white flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <span>View Knowledge</span>
                        <ChevronRight size={11} />
                      </button>
                    </div>
                  )}

                  {/* Message Feed */}
                  <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
                    {ragMessages.length === 0 && (
                      <div className="text-center py-12 px-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto mb-3">
                          <Sparkles size={20} className="text-white" />
                        </div>
                        <p className="text-[13px] font-semibold text-white font-clash">EOC Tactical Intelligence</p>
                        <p className="text-[11px] text-gray-400 font-satoshi mt-1 max-w-[250px] mx-auto leading-relaxed">
                          Generate automated municipal directives based on localized risk factors and historical flood analogues.
                        </p>
                        {ward && (
                          <button
                            onClick={fetchAlert}
                            disabled={isRAGLoading}
                            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-50 cursor-pointer"
                          >
                            <Sparkles size={12} className="text-black" />
                            <span>Generate Alert for {ward.name}</span>
                          </button>
                        )}
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
                          <div className="bg-white/[0.04] border border-white/15 rounded-xl px-3.5 py-2 text-[11px] text-zinc-300 font-mono flex items-center gap-2">
                            <Activity size={12} className="text-white animate-pulse shrink-0" />
                            <span>{msg.content}</span>
                          </div>
                        ) : (
                          /* Assistant Tactical Protocol Card */
                          <div className="rounded-2xl bg-[#0D1017] border border-white/10 p-4 shadow-xl relative group">
                            {/* Protocol Header */}
                            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/5 text-[10px] font-mono">
                              <div className="flex items-center gap-1.5 text-white font-semibold tracking-wider">
                                <Sparkles size={11} />
                                <span>MUNICIPAL TACTICAL PROTOCOL</span>
                              </div>

                              <button
                                onClick={() => handleCopy(msg.content, msg.id)}
                                className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                              >
                                {copiedId === msg.id ? (
                                  <>
                                    <Check size={11} className="text-white" />
                                    <span className="text-white">Copied</span>
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
                          <span className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-[11px] text-zinc-300 font-mono tracking-wider">Synthesizing Tactical Briefing...</span>
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
                            className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 hover:border-white/30 hover:bg-white/[0.08] text-[10px] text-gray-300 hover:text-white transition-all whitespace-nowrap font-mono shrink-0 cursor-pointer disabled:opacity-40"
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
                          className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-[12px] text-white placeholder-gray-500 outline-none focus:border-white/40 transition-colors font-satoshi" 
                        />
                        <button 
                          onClick={() => sendQuery(input)} 
                          disabled={!input.trim() || isRAGLoading} 
                          className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-30 cursor-pointer shrink-0 font-bold"
                        >
                          <Send size={13} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-500 font-mono text-center py-1">Select a ward to enable tactical queries</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
