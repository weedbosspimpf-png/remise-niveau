import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, ApiError } from "../../api/client.js";
import { useAuth } from "../../state/auth.js";

export function AuthScreen() {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const path = mode === "register" ? "/auth/register" : "/auth/login";
      const result = await apiFetch<{ userId: string; token: string }>(path, {
        method: "POST",
        body: { email, password },
      });
      auth.login(result.token, result.userId);
      navigate("/onboarding");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">EDU RESTART</h1>
      <p className="mb-8 text-slate-500">Reprends tes études à ton rythme, à ton niveau réel.</p>

      <div className="mb-6 flex rounded-lg bg-slate-100 p-1">
        <button
          className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
            mode === "register" ? "bg-white shadow" : "text-slate-500"
          }`}
          onClick={() => setMode("register")}
          type="button"
        >
          Créer un compte
        </button>
        <button
          className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
            mode === "login" ? "bg-white shadow" : "text-slate-500"
          }`}
          onClick={() => setMode("login")}
          type="button"
        >
          Se connecter
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            placeholder="toi@exemple.com"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Mot de passe
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
          />
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-lg bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "..." : mode === "register" ? "Créer mon compte" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
