import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch } from "../../api/client.js";

interface Subject {
  id: string;
  code: string;
  name: string;
}

/** Écran principal (§18) : choisir une matière pour démarrer un diagnostic. */
export function HomeScreen() {
  const [searchParams] = useSearchParams();
  const niveauId = searchParams.get("niveauId") ?? "";
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    if (!niveauId) return;
    apiFetch<Subject[]>(`/referentiel/levels/${niveauId}/subjects`).then(setSubjects);
  }, [niveauId]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">EDU RESTART</h1>
        <p className="text-slate-500">Choisis une matière pour commencer.</p>
      </div>

      <div className="flex flex-col gap-3">
        {subjects.map((subject) => (
          <div
            key={subject.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <span className="font-medium text-slate-800">{subject.name}</span>
            <div className="flex gap-2">
              <Link
                to={`/competence-map/${subject.id}`}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-center text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Progression
              </Link>
              <Link
                to={`/diagnostic/${subject.id}/${niveauId}`}
                className="flex-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-center text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Diagnostiquer
              </Link>
            </div>
          </div>
        ))}
        {subjects.length === 0 && (
          <p className="text-sm text-slate-400">Aucune matière disponible pour ce niveau.</p>
        )}
      </div>
    </div>
  );
}
