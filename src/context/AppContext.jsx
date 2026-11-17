import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);
const DEFAULT_POINTS = { gameXP:0, quizXP:0, gamesPlayed:0, quizzesTaken:0 };

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('mg_user')) || null; } catch { return null; } });
  const [points, setPoints] = useState(() => { try { return JSON.parse(localStorage.getItem('mg_points')) || DEFAULT_POINTS; } catch { return DEFAULT_POINTS; } });
  const [history, setHistory] = useState(() => { try { return JSON.parse(localStorage.getItem('mg_history')) || []; } catch { return []; } });
  // quizProgress: { [gameId]: { unlockedLevels: [1], completedLevels: { 1: { score, accuracy, passed } } } }
  const [quizProgress, setQuizProgress] = useState(() => { try { return JSON.parse(localStorage.getItem('mg_quiz_progress')) || {}; } catch { return {}; } });
  const [currentGame, setCurrentGame] = useState(null);
  const [currentSubject, setCurrentSubject] = useState(null);

  useEffect(() => { if (user) localStorage.setItem('mg_user', JSON.stringify(user)); }, [user]);
  useEffect(() => { localStorage.setItem('mg_points', JSON.stringify(points)); }, [points]);
  useEffect(() => { localStorage.setItem('mg_history', JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem('mg_quiz_progress', JSON.stringify(quizProgress)); }, [quizProgress]);

  const login = (u) => setUser(u);
  const logout = () => { setUser(null); localStorage.removeItem('mg_user'); };
  const addGameXP = (xp) => setPoints(p => ({ ...p, gameXP: p.gameXP + xp, gamesPlayed: p.gamesPlayed + 1 }));
  const addQuizXP = (xp) => setPoints(p => ({ ...p, quizXP: p.quizXP + xp, quizzesTaken: p.quizzesTaken + 1 }));
  const addHistory = (entry) => setHistory(h => [{ ...entry, date: new Date().toISOString() }, ...h].slice(0, 50));

  const saveQuizLevel = (gameId, level, result) => {
    setQuizProgress(prev => {
      const game = prev[gameId] || { unlockedLevels: [1], completedLevels: {} };
      const completedLevels = { ...game.completedLevels, [level]: result };
      const unlockedLevels = [...game.unlockedLevels];
      if (result.passed && level < 3 && !unlockedLevels.includes(level + 1)) {
        unlockedLevels.push(level + 1);
      }
      return { ...prev, [gameId]: { unlockedLevels, completedLevels } };
    });
  };

  const getQuizProgress = (gameId) => {
    return quizProgress[gameId] || { unlockedLevels: [1], completedLevels: {} };
  };

  const isLevelUnlocked = (gameId, level) => {
    const prog = quizProgress[gameId];
    if (!prog) return level === 1;
    return prog.unlockedLevels.includes(level);
  };

  const isScienceChampion = (gameId) => {
    const prog = quizProgress[gameId];
    if (!prog) return false;
    return [1,2,3].every(l => prog.completedLevels?.[l]?.passed);
  };

  const totalXP = points.gameXP + points.quizXP;
  const level = Math.floor(totalXP / 100) + 1;
  const levelProgress = totalXP % 100;

  return (
    <AppContext.Provider value={{
      user, login, logout,
      points, addGameXP, addQuizXP, totalXP, level, levelProgress,
      history, addHistory,
      currentGame, setCurrentGame,
      currentSubject, setCurrentSubject,
      quizProgress, saveQuizLevel, getQuizProgress, isLevelUnlocked, isScienceChampion,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
