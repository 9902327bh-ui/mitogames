import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import SubjectDashboard from './pages/SubjectDashboard';
import GameIntro from './pages/GameIntro';
import GamePage from './pages/GamePage';
import ResultsPage from './pages/ResultsPage';
import QuizPage from './pages/QuizPage';
import ProfilePage from './pages/ProfilePage';

function ProtectedRoute({ children }) {
  const { user } = useApp();
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/biology" element={<ProtectedRoute><SubjectDashboard subject="biology" /></ProtectedRoute>} />
      <Route path="/chemistry" element={<ProtectedRoute><SubjectDashboard subject="chemistry" /></ProtectedRoute>} />
      <Route path="/game-intro" element={<ProtectedRoute><GameIntro /></ProtectedRoute>} />
      <Route path="/game" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
      <Route path="/results" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
      <Route path="/quiz" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
