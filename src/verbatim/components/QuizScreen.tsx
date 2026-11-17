import React, { useState } from 'react';
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
      <div className="max-w-xl mx-auto bg-white border-2 border-amber-400 rounded-3xl p-7 sm:p-9 shadow-lg text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-600">
          <Award className="w-9 h-9" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Quiz Complete!</h2>
          <p className="mt-1 text-sm text-slate-600">{experiment.experimentTitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <div className="text-xs font-semibold uppercase text-emerald-700">Correct Answers</div>
            <div className="mt-1 text-2xl font-bold font-mono text-emerald-900">
              {correctCount} / {questions.length}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="text-xs font-semibold uppercase text-amber-700">Quiz Bonus Points</div>
            <div className="mt-1 text-2xl font-bold font-mono text-amber-900">+{bonusEarned}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onBackToLab}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
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
      </div>
    );
  }

  const isQuestionDone =
    (qKind === 'fill_blank' && blankSubmitted !== null) ||
    (qKind === 'flashcard' && flashAck !== null) ||
    ((qKind === 'mcq' || qKind === 'electron_flow') && selectedIdx !== null);

  return (
    <div className="max-w-2xl mx-auto bg-white border-2 border-sky-200 rounded-3xl shadow-md overflow-hidden">
      <div className="px-6 py-4 bg-sky-50 border-b border-sky-100 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToLab}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Lab</span>
        </button>
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-sky-800">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>
            {qKind === 'flashcard'
              ? 'FLASHCARD'
              : qKind === 'fill_blank'
                ? 'FILL IN THE BLANK'
                : qKind === 'electron_flow'
                  ? 'ELECTRON FLOW'
                  : 'MULTIPLE CHOICE'}{' '}
            · {currentIdx + 1} / {questions.length}
          </span>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-5">
        <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900 leading-snug">
          {q.question}
        </h3>

        {qKind === 'flashcard' ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setCardFlipped((f) => !f)}
              className={`w-full min-h-[156px] p-6 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-3 cursor-pointer ${
                cardFlipped
                  ? 'bg-indigo-50 border-indigo-400 text-indigo-950'
                  : 'bg-amber-50 border-amber-300 text-slate-900 hover:border-amber-400'
              }`}
            >
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-500">
                {cardFlipped ? 'Back — Concept Answer' : 'Front — Tap to Flip'}
              </span>
              <p className="text-base sm:text-lg font-bold">
                {cardFlipped
                  ? q.flashcardBack || q.explanation
                  : q.flashcardFront || q.question}
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700">
                <RotateCw className="w-3.5 h-3.5" />
                <span>{cardFlipped ? 'Flip back' : 'Reveal answer'}</span>
              </span>
            </button>

            {cardFlipped && flashAck === null && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleFlashConfirm(true)}
                  className="py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer"
                >
                  I knew it! (+25)
                </button>
                <button
                  type="button"
                  onClick={() => handleFlashConfirm(false)}
                  className="py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Need more review
                </button>
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
              className="w-full h-12 px-4 text-sm font-mono bg-slate-50 border-2 border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-sky-500"
            />

            {Array.isArray(q.blankChips) && q.blankChips.length > 0 && blankSubmitted === null && (
              <div className="flex flex-wrap gap-2">
                {q.blankChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setBlankValue(chip)}
                    className="px-3 py-1.5 text-xs font-mono font-bold bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 rounded-lg cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {blankSubmitted === null && (
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl cursor-pointer"
              >
                Check Answer
              </button>
            )}
          </form>
        ) : (
          <div className="space-y-2.5">
            {q.options.map((opt, idx) => {
              const isSelected = selectedIdx === idx;
              const isCorrect = idx === q.correctIndex;
              const answered = selectedIdx !== null;

              let style =
                'bg-slate-50 border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 text-slate-800';
              if (answered) {
                if (isCorrect) {
                  style = 'bg-emerald-50 border-emerald-500 text-emerald-950';
                } else if (isSelected) {
                  style = 'bg-red-50 border-red-400 text-red-950';
                } else {
                  style = 'bg-slate-50 border-slate-200 text-slate-400 opacity-75';
                }
              }

              return (
                <button
                  key={`${q.id}-opt-${idx}`}
                  type="button"
                  disabled={answered}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 font-medium text-sm transition-all flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default ${style}`}
                >
                  <span>{opt}</span>
                  {answered && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  {answered && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {isQuestionDone && (
          <div className="pt-2 space-y-4">
            <div
              className={`p-4 rounded-2xl border text-sm ${
                selectedIdx === q.correctIndex || blankSubmitted === true || flashAck === true
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}
            >
              <p className="font-bold mb-0.5">
                {selectedIdx === q.correctIndex || blankSubmitted === true || flashAck === true
                  ? 'Correct! (+25 Quiz Bonus)'
                  : `Answer: ${q.blankAnswer || q.options[q.correctIndex] || 'See below'}`}
              </p>
              <p>{q.explanation}</p>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="w-full py-3 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors cursor-pointer"
            >
              {currentIdx + 1 >= questions.length ? 'See Quiz Score' : 'Next Question'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
