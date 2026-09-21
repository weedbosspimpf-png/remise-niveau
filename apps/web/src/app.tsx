import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./state/auth.js";
import { AuthScreen } from "./screens/auth/AuthScreen.js";
import { OnboardingScreen } from "./screens/onboarding/OnboardingScreen.js";
import { HomeScreen } from "./screens/home/HomeScreen.js";
import { DiagnosticScreen } from "./screens/diagnostic/DiagnosticScreen.js";
import { CompetenceMapScreen } from "./screens/competence-map/CompetenceMapScreen.js";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AuthScreen />} />
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <OnboardingScreen />
          </RequireAuth>
        }
      />
      <Route
        path="/home"
        element={
          <RequireAuth>
            <HomeScreen />
          </RequireAuth>
        }
      />
      <Route
        path="/diagnostic/:matiereId/:niveauId"
        element={
          <RequireAuth>
            <DiagnosticScreen />
          </RequireAuth>
        }
      />
      <Route
        path="/competence-map/:matiereId"
        element={
          <RequireAuth>
            <CompetenceMapScreen />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
