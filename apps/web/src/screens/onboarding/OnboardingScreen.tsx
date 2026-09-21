import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, ApiError } from "../../api/client.js";
import { useAuth } from "../../state/auth.js";

interface Country {
  id: string;
  isoCode: string;
  name: string;
}
interface Level {
  id: string;
  code: string;
  order: number;
}

const OBJECTIFS = [
  { value: "RESUME_SCOLARITE", label: "Reprendre ma scolarité" },
  { value: "REMISE_A_NIVEAU", label: "Me remettre à niveau" },
  { value: "PREPARER_EXAMEN", label: "Préparer un examen" },
  { value: "RENFORCER_MATIERE", label: "Renforcer une matière" },
  { value: "ATTEINDRE_NIVEAU", label: "Atteindre un niveau précis" },
  { value: "APPRENDRE_DEPUIS_BASES", label: "Apprendre une matière depuis les bases" },
] as const;

/** Onboarding (§9-§10) : pays, langue, niveau déclaré, objectif. */
export function OnboardingScreen() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [countries, setCountries] = useState<Country[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [countryId, setCountryId] = useState("");
  const [niveauDeclareId, setNiveauDeclareId] = useState("");
  const [objectifType, setObjectifType] =
    useState<(typeof OBJECTIFS)[number]["value"]>("REMISE_A_NIVEAU");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<Country[]>("/referentiel/countries").then((list) => {
      setCountries(list);
      if (list[0]) setCountryId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!countryId) return;
    apiFetch<Level[]>(`/referentiel/countries/${countryId}/levels`).then((list) => {
      setLevels(list);
      if (list[0]) setNiveauDeclareId(list[0].id);
    });
  }, [countryId]);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/onboarding", {
        method: "POST",
        token,
        body: {
          countryId,
          langue: "fr",
          niveauDeclareId,
          objectif: { type: objectifType },
        },
      });
      navigate(`/home?niveauId=${niveauDeclareId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Parlons de toi</h1>
        <p className="text-slate-500">Ces informations nous aident à construire ton parcours.</p>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Pays
        <select
          value={countryId}
          onChange={(e) => setCountryId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2"
        >
          {countries.map((country) => (
            <option key={country.id} value={country.id}>
              {country.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Niveau scolaire déclaré
        <select
          value={niveauDeclareId}
          onChange={(e) => setNiveauDeclareId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2"
        >
          {levels.map((level) => (
            <option key={level.id} value={level.id}>
              {level.code}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Ton objectif
        <select
          value={objectifType}
          onChange={(e) => setObjectifType(e.target.value as typeof objectifType)}
          className="rounded-lg border border-slate-300 px-3 py-2"
        >
          {OBJECTIFS.map((objectif) => (
            <option key={objectif.value} value={objectif.value}>
              {objectif.label}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading || !countryId || !niveauDeclareId}
        className="rounded-lg bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "..." : "Continuer"}
      </button>
    </div>
  );
}
