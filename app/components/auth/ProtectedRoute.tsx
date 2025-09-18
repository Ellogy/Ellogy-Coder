import { Navigate, Outlet } from 'react-router-dom';
import React from 'react';
import { isAuthenticated } from '~/lib/api/gateway';

/**
 * Composant pour protéger les routes qui nécessitent une authentification
 * Vérifie la présence du token JWT avant d'autoriser l'accès
 */
export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuth = isAuthenticated();

  return isAuth ? <>{children}</> : <Navigate to="/login" replace />;
};

/**
 * Composant pour les routes publiques (redirige vers l'accueil si déjà connecté)
 */
export const PublicRoute = () => {
  const isAuth = isAuthenticated();

  return isAuth ? <Navigate to="/" replace /> : <Outlet />;
};
