import React, { useEffect, useRef, useState } from 'react';
import { Bot, Mic, Send, Volume2, X } from 'lucide-react';
import { HazardAlert } from '../types';

interface AiAssistantProps {
  alerts: HazardAlert[];
  onOpenHotlines: () => void;
}

interface ChatMessage {
  role: 'assistant' | 'user';
  text: string;
}

const initialMessage: ChatMessage = {
  role: 'assistant',
  text: "Hi! I'm SJ AI. I help you understand hazards in Barangay San Jose. What do you need?",
};

const buildReply = (question: string, alerts: HazardAlert[]) => {
  const text = question.toLowerCase();
  const active = alerts.filter((alert) => alert.status === 'active');
  const floods = active.filter((alert) => alert.type === 'flood');
  const critical = active.filter((alert) => alert.severity === 'critical' || alert.severity === 'high');

  if (text.includes('911') || text.includes('hotline') || text.includes('tawag') || text.includes('call') || text.includes('emergency')) {
    return 'If there is immediate danger, call 911 right away. You can also open the Hotlines directory to see rescue, fire, police, and barangay contacts.';
  }
  if (text.includes('flood') || text.includes('baha') || text.includes('tubig') || text.includes('water')) {
    if (floods.length === 0) return 'There is no active flood alert right now. Stay alert and check the live PAGASA status before traveling.';
    return `There are ${floods.length} active flood alert${floods.length > 1 ? 's' : ''}: ${floods
      .slice(0, 2)
      .map((alert) => alert.sitio)
      .join(', ')}. Avoid passing through low-lying areas and follow barangay advisories.`;
  }
  if (text.includes('safe') || text.includes('ligtas') || text.includes('gawin') || text.includes('what should')) {
    return critical.length
      ? `There are ${critical.length} high-priority alerts. Stay away from the hazard area, do not cross floodwater or return to the scene, and call 911 if lives are at risk.`
      : 'There are no high-priority alerts right now. Prepare your emergency kit, flashlight, water, and important documents.';
  }
  if (text.includes('status') || text.includes('alert') || text.includes('update')) {
    return active.length
      ? `${active.length} active alerts are being monitored now. Nearest alert: ${active[0].title} in ${active[0].sitio}.`
      : 'There are no active alerts at the moment. Keep checking the dashboard for new reports.';
  }
  return 'You can ask: "Is there flooding?", "What should I do?", or "Emergency hotline". For immediate danger, call 911.';
};

export const AiAssistant: React.FC<AiAssistantProps> = ({ alerts, onOpenHotlines }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const recognitionRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  const sendMessage = (message = input) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setMessages((current) => [
      ...current,
      { role: 'user', text: trimmed },
      { role: 'assistant', text: buildReply(trimmed, alerts) },
    ]);
    setInput('');
  };

  const startVoiceInput = () => {
    const SpeechRecognition =
      (window as Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  return (
    <div className="absolute right-5 bottom-14 z-50 sm:right-7 sm:bottom-14">
      {isOpen && (
        <section className="mb-3 flex h-[min(520px,calc(100dvh-8rem))] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600"><Bot className="h-5 w-5" /></div>
              <div><p className="text-sm font-bold">SJ AI Assistant</p><p className="text-[10px] text-slate-300">Barangay San Jose • Ready to help</p></div>
            </div>
            <button onClick={() => setIsOpen(false)} aria-label="Close AI assistant" className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3 custom-scrollbar">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${message.role === 'user' ? 'rounded-br-sm bg-blue-600 text-white' : 'rounded-bl-sm border border-slate-200 bg-white text-slate-700'}`}>{message.text}</div>
              </div>
            ))}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['Is there flooding?', 'What should I do?', 'Emergency hotline'].map((prompt) => (
                <button key={prompt} onClick={() => sendMessage(prompt)} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-100">{prompt}</button>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-blue-400">
              <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendMessage()} placeholder="Ask about hazards..." className="min-w-0 flex-1 bg-transparent px-2 text-xs text-slate-800 outline-none placeholder:text-slate-400" />
              <button onClick={startVoiceInput} aria-label="Use voice input" className={`rounded-lg p-2 ${isListening ? 'bg-red-100 text-red-600' : 'text-slate-500 hover:bg-slate-200'}`}><Mic className="h-4 w-4" /></button>
              <button onClick={() => sendMessage()} aria-label="Send message" className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700"><Send className="h-4 w-4" /></button>
            </div>
            <button onClick={onOpenHotlines} className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-rose-600 hover:text-rose-700"><Volume2 className="h-3 w-3" /> Open emergency hotlines</button>
          </div>
        </section>
      )}
      <button onClick={() => setIsOpen((open) => !open)} aria-label="Open SJ AI Assistant" className="ai-orb group relative ml-auto flex h-12 w-12 items-center justify-center text-white transition-transform hover:scale-110">
        {isOpen ? <X className="relative z-10 h-4 w-4" /> : (
          <svg className="commercial-ai-logo" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="AI Infinity Ring Logo">
            <defs>
              <linearGradient id="legalAiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00F2FE" />
                <stop offset="35%" stopColor="#4FACFE" />
                <stop offset="70%" stopColor="#0066FF" />
                <stop offset="100%" stopColor="#A855F7" />
              </linearGradient>
              <mask id="ringHoleMask">
                <rect x="0" y="0" width="200" height="200" fill="#FFFFFF" />
                <ellipse cx="75" cy="100" rx="28" ry="38" fill="#000000" transform="rotate(-15 75 100)" />
                <ellipse cx="125" cy="100" rx="28" ry="38" fill="#000000" transform="rotate(15 125 100)" />
              </mask>
            </defs>
            <g mask="url(#ringHoleMask)">
              <ellipse cx="75" cy="100" rx="52" ry="62" fill="url(#legalAiGrad)" transform="rotate(-15 75 100)" />
              <ellipse cx="125" cy="100" rx="52" ry="62" fill="url(#legalAiGrad)" opacity="0.9" transform="rotate(15 125 100)" />
            </g>
          </svg>
        )}
        <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1.5 text-[10px] font-bold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">Ask SJ AI</span>
      </button>
    </div>
  );
};

interface SpeechRecognitionLike {
  lang: string;
  onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
}
