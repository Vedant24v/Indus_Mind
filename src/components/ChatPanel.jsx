import React, { useState, useRef, useEffect } from 'react';
import { Send, Cpu, User, ChevronDown, Database, Loader2, Paperclip, BookOpen, Sliders, FileCheck, Wrench } from 'lucide-react';
import { queryDocument, uploadPDF } from '../api';

const ChatPanel = ({ docId, fileName, onUploadSuccess }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [expandedSourceIndex, setExpandedSourceIndex] = useState({}); // maps message index -> bool
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, uploadingDoc]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading || uploadingDoc) return;

    const queryText = input.trim();
    setInput('');

    const userMessage = {
      role: 'user',
      text: queryText,
    };

    setMessages((prev) => [...prev, userMessage]);

    // If no document is uploaded, show a helpful system warning instead of failing
    if (!docId) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: "No active document loaded. Please upload a PDF manual or datasheet first using the paperclip button in the chat box or the left upload panel to start querying.",
          isError: true,
        }
      ]);
      return;
    }

    setLoading(true);

    try {
      const data = await queryDocument(queryText, docId);
      
      const aiMessage = {
        role: 'assistant',
        text: data.answer,
        sources: data.sources || [],
      };
      
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error(err);
      const errorMessage = {
        role: 'assistant',
        text: `Error: ${err.response?.data?.detail || 'Failed to query the document. Please try again.'}`,
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleAttachClick = () => {
    if (loading || uploadingDoc) return;
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert("Only PDF documents are allowed.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds the 10MB limit.");
      return;
    }

    setUploadingDoc(true);
    setUploadProgress(0);

    try {
      const data = await uploadPDF(file, (percent) => {
        setUploadProgress(percent);
      });
      
      if (onUploadSuccess) {
        onUploadSuccess(data.doc_id, file.name, data.chunks);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Document "${file.name}" successfully ingested! Created ${data.chunks} vector chunks and stored them in Qdrant Cloud. Ask me anything about it!`,
          isSystem: true,
        }
      ]);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to process PDF document.");
    } finally {
      setUploadingDoc(false);
      // Reset file input value to allow uploading the same file again if needed
      e.target.value = '';
    }
  };

  const toggleSources = (index) => {
    setExpandedSourceIndex((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handlePillClick = (promptText) => {
    setInput(promptText);
  };

  const showZeroState = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Hidden File Input for Paperclip Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf"
        className="hidden"
      />

      {/* Header */}
      <div className="border-b border-zinc-800/40 p-4 bg-black/10 backdrop-blur-sm flex justify-between items-center z-10 shrink-0">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="text-zinc-400 w-4 h-4" />
            RAG Query Assistant
          </h2>
          {docId ? (
            <p className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1 font-medium">
              Active document: <span className="text-zinc-300 truncate max-w-[200px]">{fileName}</span>
            </p>
          ) : (
            <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">No active document loaded</p>
          )}
        </div>
        {docId && (
          <div className="bg-emerald-950/20 text-[10px] text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 font-semibold font-mono">
            Connected to Qdrant
          </div>
        )}
      </div>

      {/* Main Messages / Dialog Space */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {showZeroState ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 select-none max-w-2xl mx-auto w-full">
            <h3 className="text-2xl font-semibold text-zinc-100 tracking-tight mb-2">
              How can I help today?
            </h3>
            {docId ? (
              <p className="text-xs text-zinc-500 mb-8 font-medium">
                Type a command or ask a question about <span className="text-zinc-300 font-semibold">{fileName}</span>
              </p>
            ) : (
              <p className="text-xs text-zinc-500 mb-8 font-medium">
                Upload a document using the <span className="text-zinc-300 font-semibold">paperclip button</span> or left panel to get started
              </p>
            )}
            
            {/* The Centered Cool Input Box */}
            <div className="w-full bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md mb-6 transition focus-within:border-zinc-700">
              <textarea
                rows={3}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={docId ? "Ask a question about the document..." : "Ask a question, or attach a document..."}
                className="w-full bg-transparent text-white placeholder-zinc-600 text-sm focus:outline-none resize-none leading-relaxed"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
              />
              <div className="flex items-center justify-between border-t border-zinc-800/60 pt-3 mt-2">
                <div className="flex gap-1.5 text-zinc-500">
                  <button
                    type="button"
                    onClick={handleAttachClick}
                    disabled={uploadingDoc}
                    className="p-1.5 hover:bg-white/[0.04] hover:text-zinc-300 rounded-lg transition disabled:opacity-50"
                    title="Upload PDF document"
                  >
                    <Paperclip size={16} />
                  </button>
                  <button type="button" className="px-2 py-1 hover:bg-white/[0.04] hover:text-zinc-300 rounded-lg transition font-mono text-[10px] font-bold border border-zinc-800" title="Command Shortcut">
                    ⌘
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || loading || uploadingDoc}
                  className="bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-lg px-4 py-1.5 flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                >
                  <Send size={12} />
                  <span>Send</span>
                </button>
              </div>
            </div>
            
            {/* Quick Action Pills */}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              <button
                type="button"
                onClick={() => handlePillClick("Summarize the key sections of this document.")}
                className="flex items-center gap-1.5 bg-zinc-900/30 hover:bg-zinc-800/50 border border-zinc-800/60 text-xs text-zinc-400 hover:text-zinc-200 rounded-full px-3 py-1.5 transition font-medium"
              >
                <BookOpen size={12} />
                <span>Summarize Document</span>
              </button>
              <button
                type="button"
                onClick={() => handlePillClick("What are the technical specifications and operational limits?")}
                className="flex items-center gap-1.5 bg-zinc-900/30 hover:bg-zinc-800/50 border border-zinc-800/60 text-xs text-zinc-400 hover:text-zinc-200 rounded-full px-3 py-1.5 transition font-medium"
              >
                <Sliders size={12} />
                <span>Extract Specs</span>
              </button>
              <button
                type="button"
                onClick={() => handlePillClick("List all safety warnings, cautions, and hazard guidelines.")}
                className="flex items-center gap-1.5 bg-zinc-900/30 hover:bg-zinc-800/50 border border-zinc-800/60 text-xs text-zinc-400 hover:text-zinc-200 rounded-full px-3 py-1.5 transition font-medium"
              >
                <FileCheck size={12} />
                <span>List Safety Warnings</span>
              </button>
              <button
                type="button"
                onClick={() => handlePillClick("Explain the startup operations and maintenance checks.")}
                className="flex items-center gap-1.5 bg-zinc-900/30 hover:bg-zinc-800/50 border border-zinc-800/60 text-xs text-zinc-400 hover:text-zinc-200 rounded-full px-3 py-1.5 transition font-medium"
              >
                <Wrench size={12} />
                <span>Operation Checklist</span>
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const isExpanded = !!expandedSourceIndex[index];
            return (
              <div
                key={index}
                className={`flex gap-3 max-w-[85%] ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                    isUser
                      ? 'bg-white/10 border-white/10 text-white shadow-sm'
                      : msg.isError
                      ? 'bg-rose-950/30 border-rose-900 text-rose-500'
                      : msg.isSystem
                      ? 'bg-emerald-950/30 border-emerald-900 text-emerald-500'
                      : 'bg-white/[0.03] border-white/10 text-slate-300'
                  }`}
                >
                  {isUser ? <User size={14} /> : <Cpu size={14} />}
                </div>

                {/* Bubble */}
                <div className="flex flex-col space-y-1 w-full">
                  <div
                    className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-white/10 text-white ml-auto border border-white/10 shadow-sm'
                        : msg.isError
                        ? 'bg-rose-950/20 border border-rose-900/50 text-rose-200 mr-auto'
                        : msg.isSystem
                        ? 'bg-emerald-950/10 border border-emerald-900/30 text-emerald-200 mr-auto'
                        : 'bg-white/[0.02] border border-white/5 text-slate-200 mr-auto backdrop-blur-sm shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Sources section */}
                  {!isUser && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-1 mr-auto">
                      <button
                        onClick={() => toggleSources(index)}
                        className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 font-semibold transition focus:outline-none"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronDown size={12} className="rotate-180 transition-transform" />
                            Hide retrieved sources ({msg.sources.length})
                          </>
                        ) : (
                          <>
                            <ChevronDown size={12} className="transition-transform" />
                            Show retrieved sources ({msg.sources.length})
                          </>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-1.5 space-y-1.5 max-w-[520px]">
                          {msg.sources.map((src, srcIdx) => (
                            <div
                              key={srcIdx}
                              className="bg-black/40 border border-zinc-800 rounded-lg p-2.5 text-[10px] text-zinc-300 font-mono leading-relaxed"
                            >
                              <div className="text-zinc-500 font-bold mb-1 border-b border-zinc-800/60 pb-0.5 flex justify-between">
                                <span>Source Segment #{srcIdx + 1}</span>
                              </div>
                              {src}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Document Ingestion loading bubble */}
        {uploadingDoc && (
          <div className="flex gap-3 max-w-[80%] mr-auto animate-fade-in">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.03] border border-white/10 text-slate-300">
              <Cpu size={14} />
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-xs text-zinc-300 font-semibold">Uploading & indexing document...</span>
              </div>
              <div className="w-48 bg-white/5 rounded-full h-1 mt-1">
                <div className="bg-blue-500 h-1 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <span className="text-[10px] text-zinc-500 font-medium">{uploadProgress}% uploaded</span>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex gap-3 max-w-[80%] mr-auto">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.03] border border-white/10 text-slate-300">
              <Cpu size={14} />
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
              <span className="text-xs text-zinc-400 font-medium animate-pulse">Retrieving vector contexts & generating response...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Bottom Input Form (Visible when messages are active) */}
      {!showZeroState && (
        <form onSubmit={handleSend} className="p-4 bg-black/10 border-t border-zinc-800/40 shrink-0">
          <div className="max-w-3xl mx-auto w-full bg-zinc-900/30 border border-zinc-800/80 rounded-xl p-3 shadow-lg backdrop-blur-md focus-within:border-zinc-700">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || uploadingDoc}
              placeholder="Ask a follow-up question..."
              className="w-full bg-transparent text-white placeholder-zinc-500 text-sm focus:outline-none resize-none disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            <div className="flex items-center justify-between border-t border-zinc-800/50 pt-2 mt-2">
              <div className="flex gap-2 text-zinc-500">
                <button
                  type="button"
                  onClick={handleAttachClick}
                  disabled={uploadingDoc}
                  className="p-1 hover:bg-white/[0.03] hover:text-zinc-300 rounded transition disabled:opacity-50"
                  title="Upload PDF document"
                >
                  <Paperclip size={14} />
                </button>
                <span className="text-[9px] font-mono select-none px-1.5 py-0.5 bg-zinc-800/40 rounded border border-zinc-800 text-zinc-500">
                  Enter to send
                </span>
              </div>
              <button
                type="submit"
                disabled={!input.trim() || loading || uploadingDoc}
                className="bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-lg px-3.5 py-1.5 flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                <Send size={10} />
                <span>Send</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default ChatPanel;
