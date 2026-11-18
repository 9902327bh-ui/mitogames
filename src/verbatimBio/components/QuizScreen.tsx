import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  FlipHorizontal2,
  PlusCircle,
  RefreshCw,
  Trophy,
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
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-2xl mx-auto bg-white border border-[#D4E3DA] rounded-2xl p-8 text-center space-y-6"
      >
        <div className="w-14 h-14 rounded-2xl bg-[#EFF7F2] text-[#0D7A5F] flex items-center justify-center mx-auto">
          <Trophy className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#0D7A5F]">Quiz Complete</p>
          <h2 className="font-display text-3xl font-bold text-[#11241B]">
            {correctCount} / {questions.length} Correct ({pct}%)
          </h2>
          <p className="text-sm text-[#4E6B5D]">
            You earned <span className="font-mono font-semibold text-[#11241B]">+{correctCount * 25}</span> Quiz Points for {experiment.experimentTitle}.
          </p>
        </div>

        {regenError && (
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {regenError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onBackToLab}
            className="px-4 py-2.5 rounded-lg border border-[#C6DBD0] text-sm font-semibold text-[#11241B] hover:bg-[#EFF7F2] flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to lab</span>
          </button>
          <button
            type="button"
            onClick={handleRestart}
            className="px-4 py-2.5 rounded-lg border border-[#C6DBD0] text-sm font-semibold text-[#11241B] hover:bg-[#EFF7F2] cursor-pointer"
          >
            Retry Quiz
          </button>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={loadingQuiz}
            className="px-4 py-2.5 rounded-lg border border-[#0D7A5F] text-sm font-semibold text-[#0D7A5F] hover:bg-[#EFF7F2] flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loadingQuiz ? 'animate-spin' : ''}`} />
            <span>{loadingQuiz ? 'Generating...' : 'New Questions'}</span>
          </button>
          <button
            type="button"
            onClick={onNewExperiment}
            className="px-5 py-2.5 rounded-lg bg-[#0D7A5F] hover:bg-[#0A634D] text-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New experiment</span>
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
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="bg-white border border-[#D4E3DA] rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-mono font-semibold text-[#0D7A5F]">
            Question {currentIndex + 1} of {questions.length} · {kindLabel}
          </span>
          <span className="font-mono text-[#4E6B5D]">
            Bonus earned: {correctCount * 25} pts
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#E6F1EB] overflow-hidden">
          <div
            className="h-full bg-[#0D7A5F] transition-all duration-300"
            style={{ width: `${((currentIndex + (answered ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white border border-[#D4E3DA] rounded-2xl p-6 sm:p-8 space-y-6">
        {currentQ.kind === 'label_diagram' && (
          <div className="rounded-xl bg-[#F2F9F5] border border-[#CBE0D4] p-4 space-y-1">
            <p className="text-xs font-semibold text-[#0D7A5F]">
              Diagram Focus: {currentQ.diagramTitle || experiment.experimentTitle}
            </p>
            {currentQ.structureHint && (
              <p className="text-xs text-[#365245]">{currentQ.structureHint}</p>
            )}
          </div>
        )}

        <h3 className="font-display text-xl font-semibold text-[#11241B] leading-snug">
          {currentQ.question}
        </h3>

        {currentQ.kind === 'fill_blank' && (
          <div className="space-y-5">
            <div className="rounded-xl bg-[#FAFDFB] border border-[#D4E3DA] p-4 text-base text-[#11241B] leading-relaxed">
              {(currentQ.sentenceWithBlank || currentQ.question).replace(
                '_____',
                selectedChip ? `[ ${selectedChip} ]` : '_____',
              )}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {(currentQ.wordChips || currentQ.options).map((chip) => {
                const isSelected = selectedChip === chip;
                const isAnswer =
                  chip.toLowerCase().trim() ===
                  (currentQ.blankAnswer ?? currentQ.options[currentQ.correctIndex] ?? '')
                    .toLowerCase()
                    .trim();
                let style = 'bg-[#FAFDFB] border-[#C6DBD0] text-[#11241B] hover:border-[#0D7A5F]';
                if (answered) {
                  if (isAnswer) style = 'bg-emerald-50 border-emerald-600 text-emerald-950 font-semibold';
                  else if (isSelected) style = 'bg-rose-50 border-rose-500 text-rose-900';
                }
                return (
                  <button
                    key={chip}
                    type="button"
                    disabled={answered}
                    onClick={() => handleSelectChip(chip)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${style}`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentQ.kind === 'flashcard' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                labAudio.playClick();
                setFlashFlipped((f) => !f);
              }}
              className="w-full text-left rounded-xl border border-[#C6DBD0] bg-[#F6FAF7] hover:border-[#0D7A5F] p-6 transition-colors cursor-pointer space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-[#0D7A5F] font-semibold">
                <span>{flashFlipped ? 'Answer Revealed' : 'Prompt Card — Click to Flip'}</span>
                <FlipHorizontal2 className="w-4 h-4" />
              </div>
              <p className="text-base font-medium text-[#11241B]">
                {flashFlipped
                  ? currentQ.backAnswer || currentQ.options[currentQ.correctIndex]
                  : currentQ.frontPrompt || currentQ.question}
              </p>
            </button>

            {flashFlipped && !answered && (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleFlashcardCheck(true)}
                  className="px-4 py-2 rounded-lg bg-[#0D7A5F] text-white text-xs font-semibold cursor-pointer"
                >
                  I got it right (+25 pts)
                </button>
                <button
                  type="button"
                  onClick={() => handleFlashcardCheck(false)}
                  className="px-4 py-2 rounded-lg border border-[#C6DBD0] text-xs font-semibold text-[#365245] hover:bg-[#EFF7F2] cursor-pointer"
                >
                  Need more practice
                </button>
              </div>
            )}
          </div>
        )}

        {(currentQ.kind === 'mcq' || currentQ.kind === 'label_diagram') && (
          <div className="space-y-2.5">
            {currentQ.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isAnswer = idx === currentQ.correctIndex;
              let btnClass = 'border-[#D4E3DA] bg-[#FAFDFB] hover:border-[#0D7A5F] text-[#11241B]';
              if (answered) {
                if (isAnswer) {
                  btnClass = 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold';
                } else if (isSelected) {
                  btnClass = 'border-rose-500 bg-rose-50 text-rose-900';
                }
              }
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={answered}
                  onClick={() => handleAnswerMcqOrDiagram(idx)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm flex items-center justify-between gap-3 transition-colors cursor-pointer ${btnClass}`}
                >
                  <span>{opt}</span>
                  {answered && isAnswer && <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />}
                  {answered && isSelected && !isAnswer && (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {answered && (
          <motion.div
            initial={isCorrect ? { opacity: 0, y: 8, scale: 0.98 } : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            transition={{ duration: 0.22 }}
            className={`rounded-xl border p-4 space-y-2 ${
              isCorrect
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            <p className="text-xs font-semibold">
              {isCorrect ? 'Correct! +25 Quiz Points' : 'Review the biology explanation:'}
            </p>
            <p className="text-sm leading-relaxed">{currentQ.explanation}</p>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 rounded-lg bg-[#11241B] hover:bg-[#1E3B2D] text-white text-xs font-semibold cursor-pointer"
              >
                {currentIndex + 1 >= questions.length ? 'Finish Quiz →' : 'Next Question →'}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
