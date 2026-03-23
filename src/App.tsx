/// <reference types="vite/client" />
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, Chat, GenerateContentResponse, Type } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, User, Bot, Loader2, MoreVertical, Sparkles, Image as ImageIcon, Menu, Plus, History, Code, X, ChevronLeft, ChevronRight, Book as BookIcon, Maximize2, Minimize2, Save, FileText, Settings, Info, Copy, Check, BookOpen, Upload } from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type OrchestrationStep = {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  model?: string;
  result?: string;
};

type DocumentData = {
  type: 'ppt' | 'pdf' | 'word';
  title: string;
  content: any;
};

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;
  reasoningTokens?: number;
  reasoningText?: string;
  orchestrationSteps?: OrchestrationStep[];
  fallbackText?: string;
  isFallbackActive?: boolean;
  document?: DocumentData;
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  model: AIModel;
  isImageMode: boolean;
  isOrchestrationMode?: boolean;
  timestamp: number;
  bookId?: string;
};

type Book = {
  id: string;
  title: string;
  description: string;
  instructions: string;
  timestamp: number;
};

type AIModel = 'gemini-3-flash-preview' | 'z-ai/glm5' | 'minimaxai/minimax-m2.5' | 'moonshotai/kimi-k2.5' | 'nvidia/nemotron-3-super-120b-a12b' | 'mistralai/mistral-small-4-119b-2603' | 'meta-llama/llama-4-scout-17b-16e-instruct';
type ImageModel = 'gemini-2.5-flash-image';

const MODEL_GUIDE = `
# Model Selection Guide

Each model in AI Studio is selected for its unique strengths. Use this guide to choose the best tool for your task.

### ⚡ Gemini 3 Flash
**Best for:** General purpose, coding, and speed.
- High-speed responses
- Excellent at following complex instructions
- Great for debugging and code generation

### 🧠 GLM 5 (Nvidia)
**Best for:** Technical reasoning and multilingual tasks.
- Strong performance in math and logic
- Advanced understanding of technical documentation
- Excellent multilingual support

### 🎭 MiniMax m2.5 (Nvidia)
**Best for:** Creative writing and roleplay.
- Highly expressive and nuanced language
- Great for storytelling and character interaction
- Natural-sounding dialogue

### 📚 Kimi k2.5 (Nvidia)
**Best for:** Long context and document analysis.
- Optimized for processing large amounts of information
- Great for summarizing long papers or books
- High accuracy in retrieval tasks

### 🏛️ Nemotron 3 Super 120B (Nvidia)
**Best for:** High-fidelity reasoning.
- Massive scale for complex problem solving
- Deep understanding of nuanced topics
- Best for academic or research-level queries

### 🌪️ Mistral Small 4 (Nvidia)
**Best for:** Logic and concise answers.
- Balanced performance and efficiency
- Strong logical reasoning capabilities
- Great for structured data and extraction

### 🚀 Llama 4 Scout (Groq)
**Best for:** Instant responses and prototyping.
- Ultra-low latency inference
- Perfect for rapid-fire questions
- Great for quick brainstorming sessions

### 🎨 Gemini 2.5 Flash Image
**Best for:** Visual creation.
- High-quality image generation from text
- Fast processing times
- Understands complex artistic styles
`;

const ORCHESTRATION_GUIDE = `
# Orchestration Mode Guide

Orchestration Mode transforms Gemini into a master conductor. Instead of answering a complex query directly, it breaks it down into specialized tasks and delegates them to the most suitable AI models.

### 🛠️ How it Works

1.  **Planning Phase:** Gemini 3 Flash analyzes your request and creates a strategic execution plan.
2.  **Delegation:** Specialized agents (GLM 5, Mistral, Llama, etc.) are assigned specific sub-tasks based on their unique strengths.
3.  **Parallel Execution:** All agents work simultaneously to gather data, solve problems, or generate content.
4.  **Synthesis:** Gemini 3 Flash gathers all the specialized outputs and weaves them into a single, high-fidelity response.

### 🌟 When to Use It

- **Complex Research:** When you need a deep dive into multiple facets of a topic.
- **Multi-Step Coding:** For building entire features that require architecture, logic, and documentation.
- **Creative Projects:** When you need brainstorming, drafting, and editing all at once.
- **Technical Problem Solving:** For tasks that require both broad context and deep technical precision.

### 🚦 Visualizing the Pipeline

While Orchestration is active, you'll see a live **Orchestration Pipeline** in the chat. This shows you exactly which models are working on which parts of your request in real-time.
`;

const AVAILABLE_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', strength: 'General purpose, coding, speed, and orchestration.' },
  { id: 'z-ai/glm5', name: 'GLM 5', strength: 'Technical reasoning, math, logic, and multilingual tasks.' },
  { id: 'minimaxai/minimax-m2.5', name: 'MiniMax m2.5', strength: 'Creative writing, roleplay, and natural dialogue.' },
  { id: 'moonshotai/kimi-k2.5', name: 'Kimi k2.5', strength: 'Long context, document analysis, and summarization.' },
  { id: 'nvidia/nemotron-3-super-120b-a12b', name: 'Nemotron 3 Super', strength: 'High-fidelity reasoning and complex problem solving.' },
  { id: 'mistralai/mistral-small-4-119b-2603', name: 'Mistral Small 4', strength: 'Logic, concise answers, and structured data extraction.' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', strength: 'Instant responses, prototyping, and brainstorming.' },
];

import { DocumentGenerator } from './components/DocumentGenerator';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImageMode, setIsImageMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>('gemini-3-flash-preview');
  const [selectedImageModel, setSelectedImageModel] = useState<ImageModel>('gemini-2.5-flash-image');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string>(crypto.randomUUID());
  
  // Modal State
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isModelGuideOpen, setIsModelGuideOpen] = useState(false);
  const [isOrchestrationGuideOpen, setIsOrchestrationGuideOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isOrchestrationMode, setIsOrchestrationMode] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookInstructions, setNewBookInstructions] = useState('');
  
  // User State
  const [userName, setUserName] = useState('Nexus Explorer');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [tempUserName, setTempUserName] = useState('');
  const [tempUserAvatar, setTempUserAvatar] = useState<string | null>(null);
  
  const [activeMenu, setActiveMenu] = useState<{ type: 'book' | 'session', id: string } | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<Chat | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load sessions and books from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem('ai_chat_sessions');
    const savedBooks = localStorage.getItem('ai_chat_books');
    if (savedSessions) {
      try {
        setSessions(JSON.parse(savedSessions));
      } catch (e) { console.error(e); }
    }
    if (savedBooks) {
      try {
        setBooks(JSON.parse(savedBooks));
      } catch (e) { console.error(e); }
    }
  }, []);

  // Save sessions and books to localStorage
  useEffect(() => {
    if (sessions.length > 0) localStorage.setItem('ai_chat_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (books.length > 0) localStorage.setItem('ai_chat_books', JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    const currentBook = books.find(b => b.id === currentBookId);
    // Initialize chat session
    chatRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: currentBook 
          ? `You are working within a project called "${currentBook.title}". ${currentBook.instructions}`
          : 'You are a helpful, intelligent assistant.',
      },
    });
  }, [currentBookId, books]);

  // Update current session when messages change
  const lastSavedRef = useRef<string>('');
  useEffect(() => {
    if (messages.length === 0) {
      lastSavedRef.current = '';
      return;
    }

    const handler = setTimeout(() => {
      const currentData = JSON.stringify({
        messages,
        currentSessionId,
        selectedModel,
        isImageMode,
        isOrchestrationMode,
        currentBookId
      });

      if (lastSavedRef.current === currentData) return;

      setSessions(prev => {
        const existingIndex = prev.findIndex(s => s.id === currentSessionId);
        
        if (existingIndex !== -1) {
          const existing = prev[existingIndex];
          // Granular check to avoid redundant updates
          if (existing.messages === messages && 
              existing.model === selectedModel && 
              existing.isImageMode === isImageMode && 
              existing.isOrchestrationMode === isOrchestrationMode &&
              existing.bookId === (currentBookId || undefined)) {
            return prev;
          }

          const newSessions = [...prev];
          newSessions[existingIndex] = { 
            ...existing, 
            messages, 
            model: selectedModel,
            isImageMode,
            isOrchestrationMode,
            bookId: currentBookId || undefined,
            timestamp: Date.now() 
          };
          return newSessions;
        } else {
          const firstUserMsg = messages.find(m => m.role === 'user')?.text || 'New Chat';
          const title = firstUserMsg.length > 30 ? firstUserMsg.substring(0, 30) + '...' : firstUserMsg;
          return [{
            id: currentSessionId,
            title,
            messages,
            model: selectedModel,
            isImageMode,
            isOrchestrationMode,
            bookId: currentBookId || undefined,
            timestamp: Date.now()
          }, ...prev];
        }
      });
      lastSavedRef.current = currentData;
    }, 1000);

    return () => clearTimeout(handler);
  }, [messages, currentSessionId, selectedModel, isImageMode, isOrchestrationMode, currentBookId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleOrchestratedMessage = async (userMessage: string, modelMessageId: string) => {
    const HEDGING_TIMEOUT = 15000; // 15 seconds threshold

    const executeTask = async (task: any, index: number) => {
      let primaryFinished = false;
      let fallbackStarted = false;

      const runModel = async (modelName: string, isFallback = false) => {
        let result = '';
        try {
          if (modelName === 'gemini-3-flash-preview') {
            const resp = await ai.models.generateContent({ model: modelName, contents: task.prompt });
            result = resp.text || '';
          } else {
            const endpoint = modelName === 'meta-llama/llama-4-scout-17b-16e-instruct' ? '/api/groq' : '/api/chat';
            const resp = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: modelName,
                messages: [{ role: 'user', content: task.prompt }]
              })
            });
            
            const reader = resp.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            
            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (primaryFinished && !isFallback) return null; // Abort primary if fallback won
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                  if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                      const data = JSON.parse(line.slice(6));
                      result += data.choices[0]?.delta?.content || '';
                    } catch (e) {}
                  }
                }
              }
            }
          }
          return { model: modelName, result };
        } catch (e) {
          console.error(`Error in ${modelName}:`, e);
          return null;
        }
      };

      return new Promise<{ task: string, result: string }>(async (resolve) => {
        const primaryPromise = runModel(task.model);
        
        const timeoutId = setTimeout(async () => {
          if (!primaryFinished) {
            fallbackStarted = true;
            console.log(`Hedging: ${task.model} is slow for "${task.label}". Starting Gemini 3 Flash...`);
            
            setMessages(prev => prev.map(m => m.id === modelMessageId ? {
              ...m,
              orchestrationSteps: m.orchestrationSteps?.map((s, i) => i === index ? { 
                ...s, 
                model: `${task.model} (Slow) → Gemini 3 Flash`
              } : s)
            } : m));

            const fallbackResult = await runModel('gemini-3-flash-preview', true);
            if (fallbackResult && !primaryFinished) {
              primaryFinished = true;
              resolve({ task: task.label, result: fallbackResult.result });
            }
          }
        }, HEDGING_TIMEOUT);

        const primaryResult = await primaryPromise;
        if (primaryResult && !primaryFinished) {
          primaryFinished = true;
          clearTimeout(timeoutId);
          resolve({ task: task.label, result: primaryResult.result });
        }
      });
    };

    try {
      const historyText = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${getEnrichedText(m)}`).join('\n\n');
      
      // 1. Planning Phase
      const planResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [{ text: `Analyze this request: "${userMessage}". 
          Context from previous conversation:
          ${historyText}
          
          Break the request into 2-4 specialized sub-tasks. 
          Assign each task to the most suitable model from this list: ${JSON.stringify(AVAILABLE_MODELS)}.
          Return a JSON array of tasks with "label", "model", and "prompt" fields.` }]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                model: { type: Type.STRING },
                prompt: { type: Type.STRING }
              },
              required: ['label', 'model', 'prompt']
            }
          }
        }
      });

      const tasks = JSON.parse(planResponse.text || '[]');
      const steps: OrchestrationStep[] = tasks.map((t: any) => ({
        id: crypto.randomUUID(),
        label: t.label,
        model: t.model,
        status: 'pending'
      }));

      setMessages(prev => prev.map(m => m.id === modelMessageId ? { ...m, orchestrationSteps: steps } : m));

      // 2. Execution Phase
      const results = await Promise.all(tasks.map((task: any, index: number) => {
        setMessages(prev => prev.map(m => m.id === modelMessageId ? {
          ...m,
          orchestrationSteps: m.orchestrationSteps?.map((s, i) => i === index ? { ...s, status: 'loading' } : s)
        } : m));

        return executeTask(task, index).then(res => {
          setMessages(prev => prev.map(m => m.id === modelMessageId ? {
            ...m,
            orchestrationSteps: m.orchestrationSteps?.map((s, i) => i === index ? { ...s, status: 'completed', result: res.result } : s)
          } : m));
          return res;
        });
      }));

      // 3. Synthesis Phase
      const synthesisStream = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: `Context from previous conversation:
        ${historyText}
        
        Original Request: "${userMessage}"
        
        Findings from specialized agents:
        ${results.map(r => `[${r.task}]: ${r.result}`).join('\n\n')}
        
        Synthesize these findings into a final, comprehensive, and cohesive response.
        IMPORTANT: If the user requested a PPT, PDF, or Word document, you MUST provide a structured JSON response instead of plain text. 
        The JSON should have a "text" field for a friendly message and a "document" field with "type" (one of: "ppt", "pdf", "word"), "title", and "content" (array of slides/sections).
        Example JSON: {"text": "Generating your document...", "document": {"type": "pdf", "title": "My Document", "content": [{"title": "Section 1", "body": "Point 1\nPoint 2"}]}}`
      });

      let fullText = '';
      for await (const chunk of synthesisStream) {
        fullText += chunk.text || '';
        
        // Try to parse as JSON if it looks like one
        if (fullText.includes('{')) {
          try {
            const jsonMatch = fullText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const data = JSON.parse(jsonMatch[0]);
              if (data.document) {
                setMessages(prev => prev.map(m => m.id === modelMessageId ? { ...m, text: data.text || m.text, document: data.document } : m));
                continue;
              }
            }
          } catch (e) {
            // Not complete JSON yet
          }
        }
        
        setMessages(prev => prev.map(m => m.id === modelMessageId ? { ...m, text: fullText } : m));
      }
    } catch (error: any) {
      console.error('Orchestration Error:', error);
      throw error;
    }
  };

  const getEnrichedText = (m: Message) => {
    let text = m.text || '';
    if (m.orchestrationSteps && m.orchestrationSteps.length > 0) {
      const orchestrationData = m.orchestrationSteps
        .filter(s => s.status === 'completed' && s.result)
        .map(s => `[${s.label}]: ${s.result}`)
        .join('\n\n');
      if (orchestrationData) {
        text += `\n\n[Prior Orchestration Research Data]:\n${orchestrationData}`;
      }
    }
    return text;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !chatRef.current) return;

    const userMessage = input.trim();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '52px';
    }

    const userMessageId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: 'user', text: userMessage },
    ]);
    setIsLoading(true);

    const modelMessageId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: modelMessageId, role: 'model', text: '', isFallbackActive: false },
    ]);

    // Timeout Fallback Mechanism
    let primaryFinished = false;
    const FALLBACK_TIMEOUT = 10000; // 10 seconds

    const timeoutId = setTimeout(async () => {
      if (!primaryFinished) {
        console.log("Primary model taking too long. Starting fallback...");
        try {
          const fallbackResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts: [{ text: `Provide a quick, helpful response to: "${userMessage}" while the main model is still thinking.` }] }],
          });
          
          if (!primaryFinished) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === modelMessageId 
                  ? { ...msg, fallbackText: fallbackResponse.text, isFallbackActive: true } 
                  : msg
              )
            );
          }
        } catch (e) {
          console.error("Fallback error:", e);
        }
      }
    }, FALLBACK_TIMEOUT);

    try {
      if (isImageMode) {
        clearTimeout(timeoutId);
        if (selectedImageModel === 'gemini-2.5-flash-image') {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: userMessage }] },
          });

          let generatedText = '';
          let generatedImageUrl = '';

          if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) {
                generatedImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
              } else if (part.text) {
                generatedText += part.text;
              }
            }
          }

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === modelMessageId
                ? { ...msg, text: generatedText, imageUrl: generatedImageUrl, isFallbackActive: false }
                : msg
            )
          );
        } else {
          const response = await fetch('/api/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: userMessage, model: selectedImageModel })
          });

          if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
          const data = await response.json();
          let b64 = Array.isArray(data) ? (data[0]?.image || data[0]?.b64_json || data[0]?.base64) : (data.image || data.b64_json || data.data?.[0]?.b64_json || data.data?.[0]?.image || data.artifacts?.[0]?.base64);
          if (!b64) throw new Error("No image data received");

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === modelMessageId
                ? { ...msg, text: "Image generated successfully.", imageUrl: `data:image/png;base64,${b64}`, isFallbackActive: false }
                : msg
            )
          );
        }
      } else if (isOrchestrationMode) {
        await handleOrchestratedMessage(userMessage, modelMessageId);
        primaryFinished = true;
        clearTimeout(timeoutId);
      } else {
        // Standard Chat Mode
        const isDocumentRequest = /ppt|pdf|word|document/i.test(userMessage);
        
        if (selectedModel !== 'gemini-3-flash-preview') {
          const endpoint = selectedModel === 'meta-llama/llama-4-scout-17b-16e-instruct' ? '/api/groq' : '/api/chat';
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: selectedModel,
              messages: messages.map(m => ({
                role: m.role === 'model' ? 'assistant' : 'user',
                content: getEnrichedText(m)
              })).concat({ role: 'user', content: userMessage })
            })
          });

          if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
          const reader = response.body?.getReader();
          const decoder = new TextDecoder('utf-8');
          if (!reader) throw new Error("No reader available");

          let fullText = '';
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const data = JSON.parse(line.slice(6));
                  fullText += data.choices[0]?.delta?.content || '';
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === modelMessageId ? { ...msg, text: fullText } : msg
                    )
                  );
                } catch (e) {}
              }
            }
          }
          primaryFinished = true;
          clearTimeout(timeoutId);
          
          // Post-process for documents if needed
          if (isDocumentRequest && fullText.includes('{')) {
            try {
              const jsonMatch = fullText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                if (data.document) {
                  setMessages(prev => prev.map(m => m.id === modelMessageId ? { ...m, text: data.text || m.text, document: data.document } : m));
                }
              }
            } catch (e) {}
          }
        } else {
          // Gemini 3 Flash
          const currentBook = books.find(b => b.id === currentBookId);
          const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: getEnrichedText(m) }]
          }));

          const responseStream = await ai.models.generateContentStream({
            model: 'gemini-3-flash-preview',
            contents: [...history, { role: 'user', parts: [{ text: userMessage }] }],
            config: {
              systemInstruction: (currentBook 
                ? `You are working within a project called "${currentBook.title}". ${currentBook.instructions}\n\n`
                : 'You are a helpful assistant.\n\n') + 
                (isDocumentRequest 
                  ? 'The user wants a document (PPT, PDF, or Word). Provide a JSON response with "text" (confirmation) and "document" (type, title, content array). Do not show code.'
                  : ''),
            }
          });

          let fullText = '';
          for await (const chunk of responseStream) {
            fullText += chunk.text || '';
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === modelMessageId ? { ...msg, text: fullText } : msg
              )
            );
          }
          primaryFinished = true;
          clearTimeout(timeoutId);

          if (isDocumentRequest) {
            try {
              const jsonMatch = fullText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                if (data.document) {
                  setMessages(prev => prev.map(m => m.id === modelMessageId ? { ...m, text: data.text || m.text, document: data.document } : m));
                }
              }
            } catch (e) {}
          }
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      clearTimeout(timeoutId);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === modelMessageId
            ? { ...msg, text: `Error: ${error?.message || String(error)}`, isFallbackActive: false }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const createNewChat = (bookId: string | null = null) => {
    setMessages([]);
    setCurrentSessionId(crypto.randomUUID());
    setIsImageMode(false);
    setIsOrchestrationMode(false);
    setCurrentBookId(bookId);
    
    const currentBook = books.find(b => b.id === bookId);
    chatRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: currentBook 
          ? `You are working within a project called "${currentBook.title}". ${currentBook.instructions}`
          : 'You are a helpful, intelligent assistant.',
      },
    });
  };

  const loadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setIsImageMode(session.isImageMode);
    setSelectedModel(session.model);
    setIsOrchestrationMode(session.isOrchestrationMode || false);
    setCurrentBookId(session.bookId || null);
    
    const currentBook = books.find(b => b.id === session.bookId);
    chatRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: currentBook 
          ? `You are working within a project called "${currentBook.title}". ${currentBook.instructions}`
          : 'You are a helpful, intelligent assistant.',
      },
    });
  };

  const createBook = () => {
    if (!newBookTitle.trim()) return;
    const newBook: Book = {
      id: crypto.randomUUID(),
      title: newBookTitle,
      description: '',
      instructions: newBookInstructions,
      timestamp: Date.now()
    };
    setBooks([newBook, ...books]);
    setIsBookModalOpen(false);
    setNewBookTitle('');
    setNewBookInstructions('');
    setCurrentBookId(newBook.id);
    createNewChat(newBook.id);
  };

  const deleteBook = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setBooks(prev => prev.filter(b => b.id !== id));
    setSessions(prev => prev.filter(s => s.bookId !== id));
    if (currentBookId === id) setCurrentBookId(null);
    setActiveMenu(null);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      createNewChat();
    }
    setActiveMenu(null);
  };

  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear the current chat history?')) {
      setMessages([]);
      chatRef.current = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: 'You are a helpful, intelligent assistant.',
        },
      });
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const target = e.target;
    target.style.height = '52px';
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans relative overflow-hidden">
      {/* Sidebar Backdrop (Mobile) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-72 glass-panel border-r border-white/10 flex flex-col z-50 fixed inset-y-0 left-0"
          >
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-aurora-cyan/20 rounded-xl flex items-center justify-center border border-aurora-cyan/30 shadow-[0_0_15px_rgba(10,255,255,0.2)]">
                  <Sparkles className="w-6 h-6 text-aurora-cyan" />
                </div>
                <span className="font-bold text-xl tracking-tight bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">Nexus AI</span>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-8 py-4">
              <div className="space-y-2">
                <button 
                  onClick={() => createNewChat(null)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
                >
                  <Plus className="w-5 h-5 text-aurora-cyan group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-sm">New Chat</span>
                </button>
                <button 
                  onClick={() => setIsBookModalOpen(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-aurora-blue/10 hover:bg-aurora-blue/20 border border-aurora-blue/30 rounded-xl transition-all group text-aurora-light"
                >
                  <BookIcon className="w-5 h-5 text-aurora-cyan group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-sm">Create Context</span>
                </button>
              </div>

              {/* Books Section */}
              {books.length > 0 && (
                <section>
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-4 px-2">Knowledge Bases</h3>
                  <div className="space-y-1">
                    <button
                      onClick={() => setCurrentBookId(null)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${!currentBookId ? 'bg-aurora-cyan/10 text-aurora-cyan border border-aurora-cyan/20' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                    >
                      <Sparkles className={`w-4 h-4 ${!currentBookId ? 'text-aurora-cyan' : 'text-gray-500 group-hover:text-aurora-cyan'}`} />
                      <span className="text-sm font-medium">Global Context</span>
                    </button>
                    {books.map(book => (
                      <div key={book.id} className="group relative">
                        <button
                          onClick={() => setCurrentBookId(book.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${currentBookId === book.id ? 'bg-aurora-cyan/10 text-aurora-cyan border border-aurora-cyan/20' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                        >
                          <BookIcon className={`w-4 h-4 ${currentBookId === book.id ? 'text-aurora-cyan' : 'text-gray-500 group-hover:text-aurora-cyan'}`} />
                          <span className="text-sm font-medium truncate text-left">{book.title}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(activeMenu?.id === book.id ? null : { type: 'book', id: book.id });
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-lg transition-all text-gray-500"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Recent Chats */}
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-4 px-2">Recent Sessions</h3>
                <div className="space-y-1">
                  {sessions.filter(s => currentBookId ? s.bookId === currentBookId : !s.bookId).map(session => (
                    <div key={session.id} className="group relative">
                      <button
                        onClick={() => loadSession(session)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${currentSessionId === session.id ? 'bg-white/10 text-white border border-white/10' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}
                      >
                        <History className="w-4 h-4 opacity-50" />
                        <span className="text-sm font-medium truncate text-left">{session.title}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(activeMenu?.id === session.id ? null : { type: 'session', id: session.id });
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-lg transition-all text-gray-500"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="p-4 border-t border-white/5 relative">
              <button 
                onClick={() => {
                  setTempUserName(userName);
                  setTempUserAvatar(userAvatar);
                  setIsProfileModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-aurora-blue to-aurora-cyan p-[1px] shrink-0">
                  <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                    <img src={userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=NexusUser`} alt="User" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{userName}</p>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Pro Member</p>
                </div>
                <Settings className="w-4 h-4 text-gray-500 shrink-0" />
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col md:flex-row transition-all duration-300 ${isSidebarOpen ? 'md:ml-72' : 'ml-0'}`}>
        {/* Chat Section */}
        <div className="flex flex-col min-w-0 transition-all duration-300 h-screen w-full overflow-x-hidden">
          {/* Aurora Background */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#007FFF] opacity-20 blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }}></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#0AFFFF] opacity-15 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }}></div>
            <div className="absolute top-[30%] left-[50%] w-[40vw] h-[40vw] rounded-full bg-[#ADFFFF] opacity-10 blur-[90px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }}></div>
          </div>

          {/* Header - Glassmorphism */}
          <header className="relative z-20 flex items-center justify-between px-4 md:px-8 py-4 md:py-5 bg-gray-950/40 backdrop-blur-3xl border-b border-white/5 shadow-2xl">
            <div className="flex items-center gap-3 md:gap-6">
              {!isSidebarOpen && (
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-aurora-cyan transition-all shadow-xl hover:scale-105 active:scale-95"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-base md:text-lg font-bold tracking-tight text-white flex items-center gap-2.5">
                    {currentBookId ? (
                      <>
                        <div className="w-2 h-2 rounded-full bg-aurora-cyan animate-pulse shadow-[0_0_8px_rgba(10,255,255,0.8)]" />
                        {books.find(b => b.id === currentBookId)?.title}
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 rounded-full bg-aurora-blue shadow-[0_0_8px_rgba(0,127,255,0.8)]" />
                        Nexus Intelligence
                      </>
                    )}
                  </h1>
                </div>
                
                <div className="flex items-center gap-2 md:gap-3 mt-1.5 flex-wrap">
                  <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 backdrop-blur-md">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hidden sm:inline">Engine</span>
                    <select 
                      value={isImageMode ? selectedImageModel : selectedModel}
                      onChange={(e) => {
                        if (isImageMode) {
                          setSelectedImageModel(e.target.value as ImageModel);
                        } else {
                          setSelectedModel(e.target.value as AIModel);
                        }
                      }}
                      className="bg-transparent text-aurora-cyan font-mono text-[11px] outline-none cursor-pointer hover:text-white transition-colors max-w-[100px] sm:max-w-none"
                    >
                      {isImageMode ? (
                        <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image</option>
                      ) : (
                        <>
                          <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                          <option value="z-ai/glm5">GLM 5 (Nvidia)</option>
                          <option value="minimaxai/minimax-m2.5">MiniMax m2.5 (Nvidia)</option>
                          <option value="moonshotai/kimi-k2.5">Kimi k2.5 (Nvidia)</option>
                          <option value="nvidia/nemotron-3-super-120b-a12b">Nemotron 3 Super 120B (Nvidia)</option>
                          <option value="mistralai/mistral-small-4-119b-2603">Mistral Small 4 (Nvidia)</option>
                          <option value="meta-llama/llama-4-scout-17b-16e-instruct">Llama 4 Scout 17B (Groq)</option>
                        </>
                      )}
                    </select>
                  </div>

                  {!isImageMode && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsOrchestrationMode(!isOrchestrationMode)}
                        className={`group flex items-center gap-2 px-2 sm:px-3 py-1 rounded-lg border transition-all duration-300 text-[10px] font-bold uppercase tracking-wider ${
                          isOrchestrationMode 
                            ? 'bg-aurora-cyan/20 text-aurora-cyan border-aurora-cyan/40 shadow-[0_0_15px_rgba(10,255,255,0.15)]' 
                            : 'bg-white/5 text-gray-500 border-white/5 hover:text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        <Sparkles className={`w-3 h-3 ${isOrchestrationMode ? 'animate-pulse' : 'group-hover:text-aurora-cyan'}`} />
                        <span className="hidden sm:inline">Orchestration</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
            </div>
          </header>

          {/* Chat Area */}
          <main className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 scroll-smooth">
            <div className="max-w-3xl mx-auto space-y-4 md:space-y-6 pb-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 mt-20 md:mt-32 space-y-4 md:space-y-6">
                  <div className="p-4 md:p-6 bg-gray-800/30 backdrop-blur-md rounded-full shadow-[inset_1px_1px_0_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.3)] border border-white/5">
                    <Sparkles className="w-8 h-8 md:w-12 md:h-12 text-[#0AFFFF] opacity-80" />
                  </div>
                  <div className="text-center space-y-2 px-4">
                    <h2 className="text-xl md:text-2xl font-semibold text-gray-200 tracking-tight">
                      {currentBookId ? `Welcome to ${books.find(b => b.id === currentBookId)?.title}` : 'How can I help you today?'}
                    </h2>
                    <p className="text-sm md:text-base text-gray-400 max-w-md mx-auto">
                      {currentBookId 
                        ? 'This project has its own context and instructions. Start chatting to build your knowledge base.'
                        : 'Ask me anything. I can help you write code, draft emails, answer complex questions, or generate images!'}
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <React.Fragment key={msg.id}>
                    {msg.orchestrationSteps && msg.orchestrationSteps.length > 0 && (
                      <div className="flex gap-2 md:gap-4 group/row min-w-0 flex-row mb-4">
                        <div className="max-w-[90%] sm:max-w-[85%] md:max-w-[80%] min-w-0 break-words rounded-2xl px-4 md:px-6 py-3 md:py-4 relative transition-all duration-300 bg-gray-800/40 backdrop-blur-xl border border-aurora-cyan/20 shadow-[0_15px_35px_-10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-tl-sm text-gray-100">
                          <div className="relative group/orch">
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-aurora-cyan opacity-60">
                                <div className="h-[1px] flex-1 bg-aurora-cyan/20" />
                                Orchestration Pipeline
                                <div className="h-[1px] flex-1 bg-aurora-cyan/20" />
                              </div>
                              <div className="grid grid-cols-1 gap-2.5">
                                {msg.orchestrationSteps.map((step) => (
                                  <div 
                                    key={step.id} 
                                    className={`flex items-center gap-4 p-3.5 rounded-2xl border transition-all duration-500 ${
                                      step.status === 'completed' 
                                        ? 'bg-aurora-cyan/5 border-aurora-cyan/20 shadow-[inset_0_1px_1px_rgba(10,255,255,0.05)]' 
                                        : step.status === 'loading'
                                        ? 'bg-white/5 border-white/10 animate-pulse'
                                        : 'bg-gray-950/30 border-white/5 opacity-40'
                                    }`}
                                  >
                                    <div className="flex-shrink-0">
                                      {step.status === 'completed' ? (
                                        <div className="w-6 h-6 rounded-full bg-aurora-cyan/20 flex items-center justify-center border border-aurora-cyan/30">
                                          <Check className="w-3.5 h-3.5 text-aurora-cyan" />
                                        </div>
                                      ) : step.status === 'loading' ? (
                                        <div className="relative">
                                          <Loader2 className="w-6 h-6 text-aurora-cyan animate-spin" />
                                          <div className="absolute inset-0 bg-aurora-cyan/20 blur-md rounded-full animate-pulse" />
                                        </div>
                                      ) : (
                                        <div className="w-6 h-6 rounded-full bg-gray-900 border border-white/10" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-3">
                                        <span className={`text-sm font-bold tracking-tight ${step.status === 'completed' ? 'text-gray-100' : 'text-gray-500'}`}>{step.label}</span>
                                        {step.model && (
                                          <span className="text-[9px] font-black font-mono text-gray-500 bg-black/40 px-2 py-0.5 rounded-full border border-white/5 uppercase tracking-tighter">
                                            {step.model.split('/').pop()}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                              <div className="mt-3 flex justify-start opacity-100 md:opacity-0 group-hover/orch:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => {
                                    const orchText = msg.orchestrationSteps?.map(s => `[${s.label}]:\n${s.result || 'Pending...'}`).join('\n\n') || '';
                                    copyToClipboard(orchText, msg.id + '-orch');
                                  }}
                                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-all"
                                  title="Copy Orchestration Results"
                                >
                                  {copiedId === msg.id + '-orch' ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy Results</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                  <div
                    className={`flex gap-2 md:gap-4 group/row min-w-0 ${
                      msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div
                      className={`max-w-[90%] sm:max-w-[85%] md:max-w-[80%] min-w-0 break-words rounded-2xl px-4 md:px-6 py-3 md:py-4 relative transition-all duration-300 ${
                        msg.role === 'user'
                          ? 'bg-aurora-blue text-white rounded-tr-sm shadow-[0_10px_25px_-5px_rgba(0,127,255,0.4),inset_0_2px_4px_rgba(255,255,255,0.3)]' 
                          : 'bg-gray-800/40 backdrop-blur-xl border border-white/10 shadow-[0_15px_35px_-10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-tl-sm text-gray-100'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <div className="relative group/msg flex flex-col">
                          <p className="whitespace-pre-wrap leading-relaxed font-medium text-sm md:text-base">{msg.text}</p>
                          <div className="mt-2 flex justify-end opacity-100 md:opacity-0 group-hover/msg:opacity-100 transition-opacity">
                            <button 
                              onClick={() => copyToClipboard(msg.text, msg.id)}
                              className="p-1.5 bg-black/20 hover:bg-black/40 rounded-lg flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-white transition-all"
                              title="Copy Message"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-300" />
                                  <span className="text-emerald-300">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="prose prose-sm sm:prose-base prose-invert max-w-none min-w-0 break-words prose-p:leading-relaxed prose-pre:bg-gray-950/80 prose-pre:border prose-pre:border-white/5 prose-pre:shadow-2xl">
                          {msg.imageUrl && (
                            <div className="relative group/img mb-4 md:mb-6">
                              <img 
                                src={msg.imageUrl} 
                                alt="Generated by Gemini" 
                                className="rounded-2xl max-w-full h-auto shadow-2xl border border-white/10 transition-transform duration-500 group-hover/img:scale-[1.02]"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end p-2 md:p-4">
                                <button 
                                  onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = msg.imageUrl!;
                                    a.download = 'generated-image.png';
                                    a.click();
                                  }}
                                  className="px-3 py-1.5 md:px-4 md:py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-all"
                                >
                                  Download High-Res
                                </button>
                              </div>
                            </div>
                          )}
                          {msg.reasoningText && (
                            <div className="relative group/reasoning mb-6 p-5 rounded-2xl bg-gray-950/40 border border-white/5 text-gray-400 italic text-sm shadow-inner flex flex-col">
                              <div className="flex items-center gap-2 font-bold text-[10px] uppercase tracking-[0.2em] mb-3 text-gray-500">
                                <div className="w-1.5 h-1.5 rounded-full bg-aurora-cyan animate-pulse" />
                                Cognitive Trace
                              </div>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.reasoningText}
                              </ReactMarkdown>
                              <div className="mt-3 flex justify-start opacity-100 md:opacity-0 group-hover/reasoning:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => copyToClipboard(msg.reasoningText || '', msg.id + '-reasoning')}
                                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-all"
                                  title="Copy Reasoning"
                                >
                                  {copiedId === msg.id + '-reasoning' ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy Trace</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                          {msg.text ? (
                            <div className="relative group/msg flex flex-col">
                              {msg.fallbackText && (
                                <div className="mb-4 flex items-center gap-2">
                                  <button
                                    onClick={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isFallbackActive: false } : m))}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                      !msg.isFallbackActive 
                                        ? 'bg-aurora-cyan text-black shadow-[0_0_10px_rgba(10,255,255,0.4)]' 
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                                  >
                                    Detailed Answer
                                  </button>
                                  <button
                                    onClick={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isFallbackActive: true } : m))}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                      msg.isFallbackActive 
                                        ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]' 
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                                  >
                                    Fast Answer
                                  </button>
                                </div>
                              )}

                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  pre: ({node, ...props}) => <pre className="overflow-x-auto bg-black/50 p-4 rounded-xl my-4 text-sm" {...props} />,
                                  table: ({node, ...props}) => (
                                    <div className="overflow-x-auto my-4 rounded-xl border border-white/10">
                                      <table className="w-full border-collapse text-sm" {...props} />
                                    </div>
                                  ),
                                  th: ({node, ...props}) => <th className="bg-white/5 p-3 text-left font-bold border-b border-white/10" {...props} />,
                                  td: ({node, ...props}) => <td className="p-3 border-b border-white/5" {...props} />,
                                  code: ({node, inline, className, children, ...props}: any) => {
                                    return inline ? (
                                      <code className="bg-black/30 px-1.5 py-0.5 rounded-md text-aurora-cyan" {...props}>
                                        {children}
                                      </code>
                                    ) : (
                                      <code className={className} {...props}>
                                        {children}
                                      </code>
                                    );
                                  }
                                }}
                              >
                                {msg.isFallbackActive ? msg.fallbackText || '' : msg.text}
                              </ReactMarkdown>

                              {msg.document && !msg.isFallbackActive && (
                                <DocumentGenerator 
                                  type={msg.document.type}
                                  title={msg.document.title}
                                  content={msg.document.content}
                                />
                              )}
                              <div className="mt-3 flex justify-start opacity-100 md:opacity-0 group-hover/msg:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => copyToClipboard(msg.isFallbackActive ? msg.fallbackText || '' : msg.text, msg.id)}
                                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-all"
                                  title="Copy Message"
                                >
                                  {copiedId === msg.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          ) : !msg.imageUrl && !msg.reasoningText ? (
                            <div className="flex items-center gap-1.5 h-8">
                              <span className="w-2 h-2 bg-aurora-cyan rounded-full animate-bounce shadow-[0_0_8px_rgba(10,255,255,0.8)]" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 bg-aurora-cyan rounded-full animate-bounce shadow-[0_0_8px_rgba(10,255,255,0.8)]" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 bg-aurora-cyan rounded-full animate-bounce shadow-[0_0_8px_rgba(10,255,255,0.8)]" style={{ animationDelay: '300ms' }} />
                            </div>
                          ) : null}
                          {msg.reasoningTokens ? (
                            <div className="text-[10px] text-aurora-cyan/50 mt-4 pt-4 border-t border-white/5 font-mono uppercase tracking-widest">
                              Computational Load: {msg.reasoningTokens} tokens
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                  </React.Fragment>
                ))
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          </main>

          {/* Input Area - Glassmorphism Container */}
          <footer className="relative z-10 p-4 md:p-6 bg-gray-950/40 backdrop-blur-3xl border-t border-white/5 shadow-[0_-15px_35px_-10px_rgba(0,0,0,0.5)]">
            <div className="max-w-3xl mx-auto relative flex items-end gap-2 md:gap-3">
              <button
                onClick={() => setIsImageMode(!isImageMode)}
                className={`absolute left-2 md:left-3 bottom-2 md:bottom-3 z-10 p-2 md:p-2.5 rounded-xl transition-all duration-300 ${
                  isImageMode 
                    ? 'bg-aurora-cyan text-black shadow-[0_0_20px_rgba(10,255,255,0.4),inset_0_2px_4px_rgba(255,255,255,0.5)]' 
                    : 'text-gray-500 hover:text-aurora-cyan hover:bg-white/5'
                }`}
                title={isImageMode ? "Switch to Text Mode" : "Switch to Image Mode"}
              >
                <ImageIcon className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={isImageMode ? "Envision something extraordinary..." : (currentBookId ? `Consulting ${books.find(b => b.id === currentBookId)?.title}...` : "Converse with Nexus AI...")}
                className="w-full pl-10 md:pl-14 pr-12 md:pr-14 py-3 md:py-4 bg-gray-900/50 text-gray-100 border border-white/5 focus:border-aurora-cyan/30 focus:ring-4 focus:ring-aurora-cyan/5 rounded-2xl resize-none outline-none transition-all text-sm md:text-base shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] placeholder-gray-600"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '200px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 md:right-3 bottom-2 md:bottom-3 p-2 md:p-2.5 bg-aurora-blue text-white rounded-xl hover:bg-aurora-cyan hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-[0_5px_15px_-5px_rgba(0,127,255,0.5),inset_0_2px_4px_rgba(255,255,255,0.3)] active:scale-95"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                )}
              </button>
            </div>
            <div className="text-center mt-3 md:mt-4">
              <p className="text-[8px] md:text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">
                Nexus Intelligence System v2.5 • Powered by Gemini
              </p>
            </div>
          </footer>
        </div>

        {/* Canvas Section removed */}
      </div>

      {/* Create Book Modal */}
      <AnimatePresence>
        {isBookModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-br from-white/[0.02] to-transparent">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-aurora-cyan/10 rounded-2xl flex items-center justify-center border border-aurora-cyan/20">
                    <BookIcon className="w-6 h-6 text-aurora-cyan" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">New Context</h3>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Knowledge Base</p>
                  </div>
                </div>
                <button onClick={() => setIsBookModalOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-500 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Project Identifier</label>
                  <input
                    type="text"
                    placeholder="e.g. Quantum Physics Research"
                    value={newBookTitle}
                    onChange={(e) => setNewBookTitle(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-950/50 border border-white/5 focus:border-aurora-cyan/30 focus:ring-4 focus:ring-aurora-cyan/5 rounded-2xl outline-none transition-all text-white shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Core Directives</label>
                  <textarea
                    placeholder="Define the behavior and specialized knowledge for this context..."
                    value={newBookInstructions}
                    onChange={(e) => setNewBookInstructions(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-950/50 border border-white/5 focus:border-aurora-cyan/30 focus:ring-4 focus:ring-aurora-cyan/5 rounded-2xl outline-none transition-all text-white shadow-inner min-h-[120px] resize-none"
                  />
                </div>
                <button
                  onClick={createBook}
                  disabled={!newBookTitle.trim()}
                  className="w-full py-4 bg-aurora-blue hover:bg-aurora-cyan text-white hover:text-black font-bold rounded-2xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-30"
                >
                  Initialize Context
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Model Selection Guide Modal */}
      <AnimatePresence>
        {isModelGuideOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModelGuideOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[80vh] bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#007FFF] to-[#0AFFFF] flex items-center justify-center">
                    <FileText className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Model Selection Guide</h2>
                    <p className="text-xs text-gray-400">Choose the perfect tool for your task</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModelGuideOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="prose prose-invert prose-cyan max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{MODEL_GUIDE}</ReactMarkdown>
                </div>
              </div>
              <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end">
                <button
                  onClick={() => setIsModelGuideOpen(false)}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all"
                >
                  Close Guide
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Orchestration Guide Modal */}
      <AnimatePresence>
        {isOrchestrationGuideOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOrchestrationGuideOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[80vh] bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#0AFFFF]/10 rounded-xl">
                    <Settings className="w-6 h-6 text-[#0AFFFF]" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Orchestration Guide</h2>
                </div>
                <button onClick={() => setIsOrchestrationGuideOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto custom-scrollbar">
                <div className="prose prose-invert max-w-none prose-headings:text-[#0AFFFF] prose-p:text-gray-300 prose-li:text-gray-300">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{ORCHESTRATION_GUIDE}</ReactMarkdown>
                </div>
              </div>
              <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end">
                <button 
                  onClick={() => setIsOrchestrationGuideOpen(false)}
                  className="px-6 py-2 bg-[#0AFFFF] hover:bg-[#00E5E5] text-black rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(10,255,255,0.2)]"
                >
                  Got it!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900/80 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-aurora-blue/10 to-aurora-cyan/10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Profile Settings</h2>
                    <p className="text-sm text-gray-400">Manage your identity and access guides</p>
                  </div>
                </div>
                <button onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: Profile Edit */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-aurora-cyan" />
                        Identity
                      </h3>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative group">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-aurora-blue to-aurora-cyan p-[2px] shadow-[0_0_30px_rgba(10,255,255,0.2)]">
                              <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                                <img src={tempUserAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=NexusUser`} alt="User Avatar" className="w-full h-full object-cover" />
                              </div>
                            </div>
                            <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                              <Upload className="w-6 h-6 text-white" />
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setTempUserAvatar(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                          </div>
                          <div className="w-full text-center">
                            <p className="text-xs text-gray-400">Click the avatar to upload a new image</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Display Name</label>
                          <input 
                            type="text"
                            value={tempUserName}
                            onChange={(e) => setTempUserName(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-aurora-cyan/50 focus:ring-1 focus:ring-aurora-cyan/50 transition-all"
                            placeholder="Enter your name..."
                          />
                        </div>

                        <button
                          onClick={() => {
                            setUserName(tempUserName || 'Nexus Explorer');
                            setUserAvatar(tempUserAvatar);
                            setIsProfileModalOpen(false);
                          }}
                          className="w-full py-3 bg-gradient-to-r from-aurora-blue to-aurora-cyan text-black font-bold rounded-xl hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(10,255,255,0.3)]"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Guides */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-aurora-cyan" />
                        Documentation & Guides
                      </h3>
                      <div className="grid gap-4">
                        <button
                          onClick={() => {
                            setIsProfileModalOpen(false);
                            setIsOrchestrationGuideOpen(true);
                          }}
                          className="group flex items-start gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-aurora-cyan/30 transition-all text-left"
                        >
                          <div className="p-3 bg-black/40 rounded-xl group-hover:scale-110 transition-transform">
                            <Settings className="w-6 h-6 text-aurora-cyan" />
                          </div>
                          <div>
                            <h4 className="text-white font-semibold mb-1 group-hover:text-aurora-cyan transition-colors">Orchestration Guide</h4>
                            <p className="text-sm text-gray-400 leading-relaxed">Learn how Nexus breaks down complex tasks into manageable steps using multiple AI models.</p>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setIsProfileModalOpen(false);
                            setIsModelGuideOpen(true);
                          }}
                          className="group flex items-start gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-aurora-cyan/30 transition-all text-left"
                        >
                          <div className="p-3 bg-black/40 rounded-xl group-hover:scale-110 transition-transform">
                            <FileText className="w-6 h-6 text-aurora-cyan" />
                          </div>
                          <div>
                            <h4 className="text-white font-semibold mb-1 group-hover:text-aurora-cyan transition-colors">Model Selection Guide</h4>
                            <p className="text-sm text-gray-400 leading-relaxed">Discover the strengths of each available AI model to choose the right tool for your specific needs.</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
