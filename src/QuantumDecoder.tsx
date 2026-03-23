import React, { useState } from 'react';
import { 
  Terminal, 
  User, 
  Zap, 
  Clock, 
  Shield, 
  ArrowRight, 
  Info,
  Layers,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Term {
  id: string;
  raw: string;
  rendered: string;
  plainEnglish: string;
  category: 'State' | 'Time' | 'Error';
  icon: React.ReactNode;
}

const TERMS: Term[] = [
  {
    id: 'qubit-state',
    raw: '|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle',
    rendered: '$|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$',
    plainEnglish: "A qubit is a mix of two possibilities (0 and 1) at the same time, with specific 'odds' for each.",
    category: 'State',
    icon: <Layers className="w-4 h-4" />
  },
  {
    id: 't1-relaxation',
    raw: 'T_1 (Relaxation)',
    rendered: '$T_1$ (Relaxation)',
    plainEnglish: "The 'Energy Life' of the system. How long it takes for a qubit to lose its power and fall asleep.",
    category: 'Time',
    icon: <Zap className="w-4 h-4" />
  },
  {
    id: 't2-decoherence',
    raw: 'T_2 (Dephasing)',
    rendered: '$T_2$ (Dephasing)',
    plainEnglish: "The 'Focus Window.' How long the qubit can stay concentrated before background noise confuses it.",
    category: 'Time',
    icon: <Clock className="w-4 h-4" />
  },
  {
    id: 'qec',
    raw: 'QEC (Logical Qubits)',
    rendered: 'QEC (Logical Qubits)',
    plainEnglish: "Quantum Insurance. Using a team of fragile qubits to act as one strong, reliable 'Logical' qubit.",
    category: 'Error',
    icon: <Shield className="w-4 h-4" />
  }
];

export default function QuantumDecoder() {
  const [isScientistMode, setIsScientistMode] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans selection:bg-[#0AFFFF]/30">
      {/* Header */}
      <header className="max-w-4xl mx-auto pt-12 px-6 mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shadow-lg">
            <Sparkles className="text-[#0AFFFF] w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Quantum Decoder</h1>
        </div>
        <p className="text-gray-500 max-w-xl">
          Translating complex physics notation into plain English data for everyone else.
        </p>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-24">
        {/* Toggle Switch */}
        <div className="flex items-center justify-between mb-8 p-1 bg-gray-200 rounded-2xl w-fit">
          <button
            onClick={() => setIsScientistMode(false)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-medium text-sm ${
              !isScientistMode 
                ? 'bg-white text-black shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-4 h-4" />
            Human Mode
          </button>
          <button
            onClick={() => setIsScientistMode(true)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-medium text-sm ${
              isScientistMode 
                ? 'bg-black text-[#0AFFFF] shadow-lg' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Terminal className="w-4 h-4" />
            Scientist Mode
          </button>
        </div>

        {/* Decoder Grid */}
        <div className="grid gap-4">
          <AnimatePresence mode="wait">
            {TERMS.map((term) => (
              <motion.div
                key={term.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className={`group relative overflow-hidden rounded-3xl border transition-all duration-300 ${
                  isScientistMode 
                    ? 'bg-[#151619] border-white/10 text-white' 
                    : 'bg-white border-black/5 text-black shadow-sm hover:shadow-md'
                }`}
              >
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-center gap-6">
                    {/* Left: The Notation */}
                    <div className="md:w-1/3">
                      <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg mb-3 text-[10px] font-bold uppercase tracking-widest ${
                        isScientistMode ? 'bg-[#0AFFFF]/10 text-[#0AFFFF]' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {term.icon}
                        {term.category}
                      </div>
                      
                      <div className="relative">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={isScientistMode ? 'raw' : 'rendered'}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className={`text-xl font-mono ${
                              isScientistMode ? 'text-[#0AFFFF]' : 'text-black font-serif italic'
                            }`}
                          >
                            {isScientistMode ? (
                              <code className="bg-black/30 p-1 rounded">{term.raw}</code>
                            ) : (
                              <span className="font-medium tracking-tight">
                                {term.rendered.replace(/\$/g, '')}
                              </span>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Middle: Arrow */}
                    <div className="hidden md:flex items-center justify-center">
                      <ArrowRight className={`w-5 h-5 ${isScientistMode ? 'text-gray-700' : 'text-gray-200'}`} />
                    </div>

                    {/* Right: The Translation */}
                    <div className="flex-1">
                      <div className={`flex items-start gap-3 p-4 rounded-2xl ${
                        isScientistMode ? 'bg-white/5 border border-white/5' : 'bg-[#F9F9F9]'
                      }`}>
                        <Info className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                          isScientistMode ? 'text-[#0AFFFF]' : 'text-gray-400'
                        }`} />
                        <p className={`text-sm leading-relaxed ${
                          isScientistMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {term.plainEnglish}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decorative background element */}
                {isScientistMode && (
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Terminal className="w-24 h-24" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Footer Note */}
        <footer className="mt-12 p-6 rounded-3xl bg-black text-white overflow-hidden relative">
          <div className="relative z-10">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Zap className="text-[#0AFFFF] w-5 h-5" />
              Why the symbols exist
            </h3>
            <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
              Scientists use symbols like <code className="text-[#0AFFFF]">\alpha</code> or <code className="text-[#0AFFFF]">T_2</code> because they are math "shortcuts." 
              To present this to common people, we simply replace the code with the **Real Data** (the actual result) and explain the concept using analogies like "Battery Life" or "Focus Window."
            </p>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#0AFFFF] blur-[100px] opacity-20" />
        </footer>
      </main>
    </div>
  );
}
