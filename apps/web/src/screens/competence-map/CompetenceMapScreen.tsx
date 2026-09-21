import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../../api/client.js";
import { useAuth } from "../../state/auth.js";

interface CompetenceEntry {
  competenceId: string;
  competenceName: string;
  domainName: string;
  status: string;
  scorePct: number | null;
}

const STATUS_COLOR: Record<string, string> = {
  NOT_ASSESSED: "bg-slate-200",
  WEAK: "bg-rose-500",
  LEARNING: "bg-amber-500",
  DEVELOPING: "bg-sky-500",
  MASTERED: "bg-emerald-500",
  REQUIRES_REVIEW: "bg-orange-500",
};

const STATUS_LABEL: Record<string, string> = {
  NOT_ASSESSED: "Non évalué",
  WEAK: "Faible",
  LEARNING: "En apprentissage",
  DEVELOPING: "En progrès",
  MASTERED: "Maîtrisé",
  REQUIRES_REVIEW: "À réviser",
};

/** Carte de compétences (§13, §16) — une barre de progression par compétence. */
export function CompetenceMapScreen() {
  const { matiereId = "" } = useParams();
  const { token } = useAuth();
  const [entries, setEntries] = useState<CompetenceEntry[]>([]);

  useEffect(() => {
    apiFetch<CompetenceEntry[]>(`/profile/competence-map?matiereId=${matiereId}`, { token }).then(
      setEntries,
    );
  }, [matiereId, token]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ma progression</h1>
        <p className="text-slate-500">Compétence par compétence.</p>
      </div>

      <div className="flex flex-col gap-4">
        {entries.map((entry) => (
          <div key={entry.competenceId}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">{entry.competenceName}</span>
              <span className="text-slate-400">{entry.scorePct ?? 0}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${STATUS_COLOR[entry.status] ?? "bg-slate-300"}`}
                style={{ width: `${entry.scorePct ?? 0}%` }}
              />
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              {entry.domainName} · {STATUS_LABEL[entry.status] ?? entry.status}
            </p>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-sm text-slate-400">
            Pas encore de diagnostic pour cette matière — lance-en un pour voir ta progression.
          </p>
        )}
      </div>

      <Link to="/home" className="text-center text-sm text-slate-500">
        Retour à l'accueil
      </Link>
    </div>
  );
}
