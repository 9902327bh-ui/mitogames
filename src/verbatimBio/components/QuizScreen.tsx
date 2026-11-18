import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  ArrowLeft,
  CheckCircle2,
  FlipHorizontal2,
  PlusCircle,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import type { BioExperiment, QuizQuestion } from '../types.ts';
import { labAudio } from '../utils/labAudio.ts';

interface QuizScreenProps {
  experiment: BioExperiment;
  classLevel: number;
  onAwardQuizPoints: (points: number) => void;
  onBackToLab: () => void;
  onNewExperiment: () => void;
}

export const QuizScreen: React.FC<QuizScreenProps> = ({
  experiment,
  classLevel,
  onAwardQuizPoints,
  onBackToLab,
  onNewExperiment,
}) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>(experiment.quiz);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [selectedChip, setSelectedChip] = useState<string>('');
  const [flashFlipped, setFlashFlipped] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [regenError, setRegenError] = useState('');

  // Auto-fetch if experiment came with fewer than 3 questions
  useEffect(() => {
    setQuestions(experiment.quiz);
    setCurrentIndex(0);
    setCorrectCount(0);
    setFinished(false);
    setSelectedOption(null);
    setSelectedChip('');
    setFlashFlipped(false);
    setAnswered(false);
    setIsCorrect(false);
  }, [experiment.slug, experiment.quiz]);

  const currentQ = questions[currentIndex];

  const resetForQuestion = () => {
    setSelectedOption(null);
    setSelectedChip('');
    setFlashFlipped(false);
    setAnswered(false);
    setIsCorrect(false);
  };

  const handleAnswerMcqOrDiagram = (idx: number) => {
    if (answered || !currentQ) return;
    setSelectedOption(idx);
    const correct = idx === currentQ.correctIndex;
    setAnswered(true);
    setIsCorrect(correct);
    if (correct) {
      labAudio.playSuccess();
      setCorrectCount((c) => c + 1);
      onAwardQuizPoints(25);
    } else {
      labAudio.playGentleError();
    }
  };

  const handleSelectChip = (chip: string) => {
    if (answered || !currentQ) return;
    setSelectedChip(chip);
    const target = (currentQ.blankAnswer ?? currentQ.options[currentQ.correctIndex] ?? '')
      .toLowerCase()
      .trim();
    const correct = chip.toLowerCase().trim() === target;
    setAnswered(true);
    setIsCorrect(correct);
    if (correct) {
      labAudio.playSuccess();
      setCorrectCount((c) => c + 1);
      onAwardQuizPoints(25);
    } else {
      labAudio.playGentleError();
    }
  };

  const handleFlashcardCheck = (knewIt: boolean) => {
    if (answered || !currentQ) return;
    setAnswered(true);
    setIsCorrect(knewIt);
    if (knewIt) {
      labAudio.playSuccess();
      setCorrectCount((c) => c + 1);
      onAwardQuizPoints(25);
    } else {
      labAudio.playClick();
    }
  };

  const handleNext = () => {
    labAudio.playClick();
    if (currentIndex + 1 >= questions.length) {
      labAudio.playVictory();
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      resetForQuestion();
    }
  };

  const handleRestart = () => {
    labAudio.playClick();
    setCurrentIndex(0);
    setCorrectCount(0);
    setFinished(false);
    resetForQuestion();
  };

  const handleRegenerate = async () => {
    setLoadingQuiz(true);
    setRegenError('');
    labAudio.playClick();
    try {
      const res = await fetch('/api/biology/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experiment,
          classLevel,
          regenerate: true,
        }),
      });
      const data = (await res.json()) as { quiz?: QuizQuestion[]; error?: string };
      if (!res.ok || !data.quiz || data.quiz.length === 0) {
        throw new Error(data.error || 'Could not generate fresh quiz questions.');
      }
      setQuestions(data.quiz);
      setCurrentIndex(0);
      setCorrectCount(0);
      setFinished(false);
      resetForQuestion();
      labAudio.playSuccess();
    } catch (err) {
      labAudio.playGentleError();
      setRegenError(err instanceof Error ? err.message : 'Quiz refresh failed.');
    } finally {
      setLoadingQuiz(false);
    }
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="bg-white border border-[#D4E3DA] rounded-2xl p-8 text-center space-y-4">
        <p className="font-display text-lg font-semibold text-[#11241B]">
          No quiz questions ready yet
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={loadingQuiz}
            className="px-4 py-2 rounded-lg bg-[#0D7A5F] text-white text-sm font-semibold cursor-pointer"
          >
            {loadingQuiz ? 'Generating...' : 'Generate Biology Quiz'}
          </button>
          <button
            type="button"
            onClick={onBackToLab}
            className="px-4 py-2 rounded-lg border border-[#C6DBD0] text-sm font-semibold text-[#11241B] cursor-pointer"
          >
            Back to lab
          </button>
        </div>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((correctCount / questions.length) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="max-w-2xl mx-auto bg-white/95 backdrop-blur-md border border-amber-200/80 rounded-3xl p-9 sm:p-12 text-center space-y-7 shadow-xl shadow-amber-950/5"
      >
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-inner">
          <Award className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
            🌿 Biology Lab Quiz Complete
          </span>
          <h2 className="font-display text-3xl font-extrabold text-slate-800">Quiz Complete!</h2>
          <p className="text-sm font-medium text-slate-600">{experiment.experimentTitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">Correct Answers</div>
            <div className="mt-1.5 text-2xl font-bold font-mono text-emerald-900">{correctCount} / {questions.length} <span className="text-sm">({pct}%)</span></div>
          </div>
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-800">Quiz Bonus XP</div>
            <div className="mt-1.5 text-2xl font-bold font-mono text-amber-900">+{correctCount * 25} XP</div>
          </div>
        </div>

        {regenError && (
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
            {regenError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onBackToLab}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Lab</span>
          </button>
          <button
            type="button"
            onClick={handleRestart}
            className="px-5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 text-sm font-bold text-emerald-800 transition-all cursor-pointer"
          >
            Retry Quiz
          </button>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={loadingQuiz}
            className="px-5 py-2.5 rounded-xl border border-emerald-500 text-sm font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loadingQuiz ? 'animate-spin' : ''}`} />
            <span>{loadingQuiz ? 'Generating...' : 'New Questions'}</span>
          </button>
          <button
            type="button"
            onClick={onNewExperiment}
            className="px-5 py-2.5 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Experiment</span>
          </button>
        </div>
      </motion.div>
    );
  }

  const kindLabel =
    currentQ.kind === 'fill_blank'
      ? 'Fill in the Blank'
      : currentQ.kind === 'flashcard'
        ? 'Flashcard'
        : currentQ.kind === 'label_diagram'
          ? 'Label the Diagram'
          : 'Multiple Choice';

  return (
    <motion.div initial={{ opacity: 0, y: 18, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.38, ease: 'easeOut' }} className="max-w-4xl mx-auto bg-white/95 backdrop-blur-md border border-sky-100 rounded-3xl shadow-xl shadow-sky-950/5 overflow-hidden">
      <div className="px-6 py-5 sm:px-8 sm:py-6 bg-gradient-to-r from-sky-50 via-indigo-50/40 to-sky-50 border-b border-sky-100/80 flex items-center justify-between gap-4">
        <button type="button" onClick={onBackToLab} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-white shadow-sm transition-all cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /><span>Back to Lab</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200">🌿 {kindLabel}</span>
          <span className="text-xs font-mono font-bold text-slate-600 bg-white/70 px-2.5 py-1 rounded-full border border-slate-200">{currentIndex + 1} / {questions.length}</span>
        </div>
      </div>

      <div className="p-8 sm:p-12 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold text-slate-700">Question {currentIndex + 1} of {questions.length}</span>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 font-bold text-xs">⚡ Bonus: <span className="font-mono text-sm text-amber-900">+{correctCount * 25} pts</span></span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500" initial={false} animate={{ width: `${((currentIndex + (answered ? 1 : 0)) / questions.length) * 100}%` }} transition={{ duration: 0.55, ease: 'easeInOut' }} />
        </div>
        {currentQ.kind === 'label_diagram' && (
          <div className="rounded-2xl bg-gradient-to-r from-emerald-50/90 to-teal-50/50 border border-emerald-200/70 p-4 space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <span>🔬</span> Diagram Focus: {currentQ.diagramTitle || experiment.experimentTitle}
            </p>
            {currentQ.structureHint && (
              <p className="text-xs text-emerald-900/80 pl-5">{currentQ.structureHint}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
            {experiment.experimentTitle}
          </span>
          <h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-800 leading-relaxed tracking-tight">
            {currentQ.question}
          </h3>
        </div>

        {currentQ.kind === 'fill_blank' && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-5 text-base sm:text-lg font-medium text-slate-800 leading-relaxed">
              {(currentQ.sentenceWithBlank || currentQ.question).replace(
                '_____',
                selectedChip ? `[ ${selectedChip} ]` : '____',
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {(currentQ.wordChips || currentQ.options).map((chip) => {
                const isSelected = selectedChip === chip;
                const isAnswer =
                  chip.toLowerCase().trim() ===
                  (currentQ.blankAnswer ?? currentQ.options[currentQ.correctIndex] ?? '')
                    .toLowerCase()
                    .trim();
                let style = 'bg-white border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 hover:shadow-sm';
                if (answered) {
                  if (isAnswer) style = 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold ring-2 ring-emerald-500/20';
                  else if (isSelected) style = 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20';
                }
                return (
                  <button
                    key={chip}
                    type="button"
                    disabled={answered}
                    onClick={() => handleSelectChip(chip)}
                    className={`px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer ${style}`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentQ.kind === 'flashcard' && (
          <div className="space-y-5">
            <motion.button whileHover={{ y: -2, scale: 1.008 }} whileTap={{ scale: 0.985 }}
              type="button"
              onClick={() => {
                labAudio.playClick();
                setFlashFlipped((f) => !f);
              }}
              className="w-full text-left rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white hover:border-emerald-500 p-7 transition-all duration-200 cursor-pointer space-y-3 shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between text-xs text-emerald-700 font-bold uppercase tracking-wider">
                <span>{flashFlipped ? 'Answer Revealed' : 'Prompt Card — Click to Flip'}</span>
                <FlipHorizontal2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-lg font-semibold text-slate-800 leading-snug">
                {flashFlipped
                  ? currentQ.backAnswer || currentQ.options[currentQ.correctIndex]
                  : currentQ.frontPrompt || currentQ.question}
              </p>
            </motion.button>

            {flashFlipped && !answered && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <motion.button
                  type="button"
                  onClick={() => handleFlashcardCheck(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                >
                  I got it right (+25 pts)
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => handleFlashcardCheck(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Need more practice
                </motion.button>
              </div>
            )}
          </div>
        )}

        {(currentQ.kind === 'mcq' || currentQ.kind === 'label_diagram') && (
          <div className="space-y-3">
            {currentQ.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isAnswer = idx === currentQ.correctIndex;
              const letter = String.fromCharCode(65 + idx);

              let containerClass =
                'border-slate-200 bg-slate-50/60 hover:bg-emerald-50/40 hover:border-emerald-400 text-slate-800 hover:shadow-sm';
              let badgeClass = 'bg-white text-slate-600 border border-slate-200';

              if (answered) {
                if (isAnswer) {
                  containerClass =
                    'border-emerald-500 bg-emerald-50/90 text-emerald-950 font-bold ring-2 ring-emerald-500/20';
                  badgeClass = 'bg-emerald-600 text-white border-emerald-600';
                } else if (isSelected) {
                  containerClass =
                    'border-rose-400 bg-rose-50/90 text-rose-950 ring-2 ring-rose-500/20';
                  badgeClass = 'bg-rose-500 text-white border-rose-500';
                } else {
                  containerClass = 'border-slate-200 bg-slate-50/40 text-slate-400 opacity-60';
                  badgeClass = 'bg-slate-100 text-slate-400 border-slate-200';
                }
              }

              return (
                <motion.button
                  key={idx}
                  type="button"
                  disabled={answered}
                  onClick={() => handleAnswerMcqOrDiagram(idx)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.055, duration: 0.25 }}
                  whileHover={{ y: -2, scale: 1.008 }}
                  whileTap={{ scale: 0.985 }}
                  className={`w-full text-left px-6 py-5 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer group ${containerClass}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${badgeClass}`}
                    >
                      {letter}
                    </span>
            <span className="text-base sm:text-lg leading-snug">{opt}</span>
                  </div>

                  <div className="shrink-0 flex items-center">
                    {answered && isAnswer && (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/90 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-4 h-4" /> Correct
                      </span>
                    )}
                    {answered && isSelected && !isAnswer && (
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

        {answered && (
          <motion.div
            initial={isCorrect ? { opacity: 0, y: 10, scale: 0.98 } : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className={`rounded-2xl border-2 p-5 sm:p-6 space-y-3 ${
              isCorrect
                ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300 text-emerald-950 shadow-sm'
                : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 text-amber-950 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                {isCorrect ? '✨ Outstanding! +25 Quiz Points' : '💡 Scientific Explanation'}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-700 font-medium">{currentQ.explanation}</p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-bold shadow-md shadow-emerald-900/10 hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center gap-1.5"
              >
                <span>{currentIndex + 1 >= questions.length ? 'Finish Quiz 🏆' : 'Next Question →'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
