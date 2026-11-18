import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  FlaskConical,
  RotateCw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import type { ElectroExperiment, LabExperiment, QuizQuestion } from '../types.ts';

interface QuizScreenProps {
  experiment: LabExperiment | ElectroExperiment;
  questions: QuizQuestion[];
  onCompleteQuiz: (bonusPoints: number, correctCount: number) => void;
  onBackToLab: () => void;
  onNewExperiment: () => void;
}

function normalizeChemistryInput(raw: string): string {
  const subMap: Record<string, string> = {
    '₀': '0',
    '₁': '1',
    '₂': '2',
    '₃': '3',
    '₄': '4',
    '₅': '5',
    '₆': '6',
    '₇': '7',
    '₈': '8',
    '₉': '9',
    '⁺': '+',
    '⁻': '-',
    '²': '2',
    '³': '3',
    '→': '->',
    '⟶': '->',
  };
  return raw
    .trim()
    .split('')
    .map((ch) => subMap[ch] ?? ch)
    .join('')
    .replace(/\s+/g, '')
    .toLowerCase();
}

export const QuizScreen: React.FC<QuizScreenProps> = ({
  experiment,
  questions,
  onCompleteQuiz,
  onBackToLab,
  onNewExperiment,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [blankValue, setBlankValue] = useState('');
  const [blankSubmitted, setBlankSubmitted] = useState<boolean | null>(null);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [flashAck, setFlashAck] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[currentIdx];

  if (!q || questions.length === 0) {
    return (
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-8 text-center space-y-4">
        <p className="text-sm text-slate-600">No quiz questions available for this lab yet.</p>
        <button
          type="button"
          onClick={onBackToLab}
          className="px-4 py-2 text-sm font-bold text-white bg-sky-600 rounded-xl cursor-pointer"
        >
          Back to 3D Lab
        </button>
      </div>
    );
  }

  const qKind = q.kind ?? 'mcq';

  const handleSelectOption = (optionIdx: number) => {
    if (selectedIdx !== null) return;
    setSelectedIdx(optionIdx);
    if (optionIdx === q.correctIndex) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleSubmitBlank = (e: React.FormEvent) => {
    e.preventDefault();
    if (blankSubmitted !== null) return;
    const expected = normalizeChemistryInput(q.blankAnswer || q.options[q.correctIndex] || '');
    const actual = normalizeChemistryInput(blankValue);
    const isRight = Boolean(actual) && (actual === expected || expected.includes(actual) && actual.length >= 2);
    setBlankSubmitted(isRight);
    if (isRight) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleFlashConfirm = (remembered: boolean) => {
    if (flashAck !== null) return;
    setFlashAck(remembered);
    if (remembered) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 >= questions.length) {
      const earned = correctCount * 25;
      setFinished(true);
      onCompleteQuiz(earned, correctCount);
    } else {
      setCurrentIdx((i) => i + 1);
      setSelectedIdx(null);
      setBlankValue('');
      setBlankSubmitted(null);
      setCardFlipped(false);
      setFlashAck(null);
    }
  };

  if (finished) {
    const bonusEarned = correctCount * 25;
    return (
      <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.4 }} className="max-w-2xl mx-auto bg-white/95 backdrop-blur-md border border-amber-200/80 rounded-3xl p-9 sm:p-12 shadow-xl shadow-amber-950/5 text-center space-y-7">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-inner">
          <Award className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
            🧪 Chemistry Lab Quiz Complete
          </span>
          <h2 className="font-display text-3xl font-extrabold text-slate-800">Quiz Complete!</h2>
          <p className="text-sm font-medium text-slate-600">{experiment.experimentTitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">Correct Answers</div>
            <div className="mt-1.5 text-2xl font-bold font-mono text-emerald-900">
              {correctCount} / {questions.length}
            </div>
          </div>
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-800">Quiz Bonus XP</div>
            <div className="mt-1.5 text-2xl font-bold font-mono text-amber-900">+{bonusEarned} XP</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onBackToLab}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <FlaskConical className="w-4 h-4" />
            <span>Back to 3D Lab</span>
          </button>
          <button
            type="button"
            onClick={onNewExperiment}
            className="px-5 py-2.5 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors cursor-pointer"
          >
            Pick Next Experiment
          </button>
        </div>
      </motion.div>
    );
  }

  const isQuestionDone =
    (qKind === 'fill_blank' && blankSubmitted !== null) ||
    (qKind === 'flashcard' && flashAck !== null) ||
    ((qKind === 'mcq' || qKind === 'electron_flow') && selectedIdx !== null);

  return (
    <motion.div initial={{ opacity: 0, y: 18, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.38, ease: 'easeOut' }} className="max-w-4xl mx-auto bg-white/95 backdrop-blur-md border border-sky-100 rounded-3xl shadow-xl shadow-sky-950/5 overflow-hidden">
      {/* Top Bar with Navigation & Tracker */}
      <div className="px-6 py-5 sm:px-8 sm:py-6 bg-gradient-to-r from-sky-50 via-indigo-50/40 to-sky-50 border-b border-sky-100/80 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToLab}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-white shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Lab</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            {qKind === 'flashcard'
              ? 'FLASHCARD'
              : qKind === 'fill_blank'
                ? 'FILL IN THE BLANK'
                : qKind === 'electron_flow'
                  ? 'ELECTRON FLOW'
                  : 'MULTIPLE CHOICE'}
          </span>
          <span className="text-xs font-mono font-bold text-slate-600 bg-white/70 px-2.5 py-1 rounded-full border border-slate-200">
            {currentIdx + 1} / {questions.length}
          </span>
        </div>
      </div>

      <div className="p-8 sm:p-12 space-y-8">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
            {experiment.experimentTitle}
          </span>
          <h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-800 leading-snug">
            {q.question}
          </h3>
        </div>

        {qKind === 'flashcard' ? (
          <div className="space-y-4">
            <motion.button whileHover={{ y: -3, rotateY: 2 }} whileTap={{ scale: 0.985 }}
              type="button"
              onClick={() => setCardFlipped((f) => !f)}
              className={`w-full min-h-[160px] p-7 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-3 cursor-pointer shadow-sm hover:shadow-md ${
                cardFlipped
                  ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-300 text-indigo-950'
                  : 'bg-gradient-to-br from-amber-50/70 to-orange-50/40 border-amber-200 text-slate-900 hover:border-amber-300'
              }`}
            >
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-500">
                {cardFlipped ? 'Back — Concept Answer' : 'Front — Tap to Flip'}
              </span>
              <p className="text-lg font-bold leading-snug">
                {cardFlipped
                  ? q.flashcardBack || q.explanation
                  : q.flashcardFront || q.question}
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 bg-white/80 px-3 py-1 rounded-full border border-sky-200 shadow-2xs">
                <RotateCw className="w-3.5 h-3.5" />
                <span>{cardFlipped ? 'Flip back' : 'Reveal answer'}</span>
              </span>
            </motion.button>

            {cardFlipped && flashAck === null && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => handleFlashConfirm(true)}
                  className="py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  I knew it! (+25 XP)
                </motion.button>
                <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => handleFlashConfirm(false)}
                  className="py-3 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Need more review
                </motion.button>
              </div>
            )}
          </div>
        ) : qKind === 'fill_blank' ? (
          <form onSubmit={handleSubmitBlank} className="space-y-4">
            <input
              type="text"
              value={blankValue}
              onChange={(e) => setBlankValue(e.target.value)}
              disabled={blankSubmitted !== null}
              placeholder="Type missing term (e.g. 2e⁻ or Cu²⁺)..."
              className="w-full h-13 px-5 text-base font-mono bg-slate-50 border-2 border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-sky-500 transition-all"
            />

            {Array.isArray(q.blankChips) && q.blankChips.length > 0 && blankSubmitted === null && (
              <div className="flex flex-wrap gap-2.5">
                {q.blankChips.map((chip) => (
                  <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                    key={chip}
                    type="button"
                    onClick={() => setBlankValue(chip)}
                    className="px-4 py-2 text-xs font-mono font-bold bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 rounded-xl transition-all cursor-pointer shadow-2xs"
                  >
                    {chip}
                  </motion.button>
                ))}
              </div>
            )}

            {blankSubmitted === null && (
              <motion.button whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.98 }}
                type="submit"
                className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 rounded-xl shadow-md transition-all cursor-pointer"
              >
                Check Answer
              </motion.button>
            )}
          </form>
        ) : (
          <div className="space-y-3">
            {q.options.map((opt, idx) => {
              const isSelected = selectedIdx === idx;
              const isCorrect = idx === q.correctIndex;
              const answered = selectedIdx !== null;
              const letter = String.fromCharCode(65 + idx);

              let style =
                'bg-slate-50/70 border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 text-slate-800 hover:shadow-xs';
              let badgeStyle = 'bg-white text-slate-600 border border-slate-200';

              if (answered) {
                if (isCorrect) {
                  style = 'bg-emerald-50/90 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-500/20';
                  badgeStyle = 'bg-emerald-600 text-white border-emerald-600';
                } else if (isSelected) {
                  style = 'bg-rose-50/90 border-rose-400 text-rose-950 ring-2 ring-rose-500/20';
                  badgeStyle = 'bg-rose-500 text-white border-rose-500';
                } else {
                  style = 'bg-slate-50/40 border-slate-200 text-slate-400 opacity-60';
                  badgeStyle = 'bg-slate-100 text-slate-400 border-slate-200';
                }
              }

              return (
                <motion.button
                  key={`${q.id}-opt-${idx}`}
                  type="button"
                  disabled={answered}
                  onClick={() => handleSelectOption(idx)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.055, duration: 0.25 }}
                  whileHover={{ y: -2, scale: 1.008 }}
                  whileTap={{ scale: 0.985 }}
                  className={`w-full text-left px-6 py-5 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer disabled:cursor-default ${style}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${badgeStyle}`}>
                      {letter}
                    </span>
                    <span className="text-base sm:text-lg leading-snug">{opt}</span>
                  </div>

                  <div className="shrink-0 flex items-center">
                    {answered && isCorrect && (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/90 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-4 h-4" /> Correct
                      </span>
                    )}
                    {answered && isSelected && !isCorrect && (
                      <span className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100/90 px-2.5 py-1 rounded-full">
                        <XCircle className="w-4 h-4" /> Incorrect
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {isQuestionDone && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="pt-2 space-y-4">
            <div
              className={`p-5 rounded-2xl border-2 space-y-2 ${
                selectedIdx === q.correctIndex || blankSubmitted === true || flashAck === true
                  ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300 text-emerald-950'
                  : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 text-amber-950'
              }`}
            >
              <p className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                {selectedIdx === q.correctIndex || blankSubmitted === true || flashAck === true
                  ? '✨ Outstanding! (+25 Quiz Bonus)'
                  : `💡 Correct Concept: ${q.blankAnswer || q.options[q.correctIndex] || 'See explanation'}`}
              </p>
              <p className="text-sm leading-relaxed text-slate-700">{q.explanation}</p>
            </div>
            <motion.button whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleNext}
              className="w-full py-3.5 text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 rounded-xl shadow-md transition-all cursor-pointer"
            >
              {currentIdx + 1 >= questions.length ? 'See Quiz Score 🏆' : 'Next Question →'}
            </motion.button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
