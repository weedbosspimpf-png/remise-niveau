import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../../api/client.js";
import { useAuth } from "../../state/auth.js";

interface Choice {
  competenceId: string;
  label: string;
}
interface Question {
  questionId: string;
  prompt: string;
  choices: Choice[];
}
interface StartResponse {
  sessionId: string;
  questions: Question[];
}
interface AnswerResponse {
  estCorrecte: boolean;
  correctCompetenceId: string;
}
interface CompleteResponse {
  aggregateScorePct: number;
  niveauMaitrise: boolean;
  competenceScores: { competenceId: string; scorePct: number; status: string }[];
}

/**
 * Écran de diagnostic (§18) : ÉCOUTE/LIS, choisis une réponse, feedback
 * immédiat, puis question suivante. À la fin, résumé de session (§17).
 */
export function DiagnosticScreen() {
  const { matiereId = "", niveauId = "" } = useParams();
  const { token } = useAuth();

  const [session, setSession] = useState<StartResponse | null>(null);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<AnswerResponse | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<CompleteResponse | null>(null);

  useEffect(() => {
    apiFetch<StartResponse>("/diagnostic/sessions", {
      method: "POST",
      token,
      body: { matiereId, niveauId },
    }).then(setSession);
  }, [matiereId, niveauId, token]);

  if (!session) {
    return <div className="p-10 text-center text-slate-500">Préparation du diagnostic…</div>;
  }

  if (result) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Session terminée</h1>
        <p className="text-lg text-slate-700">
          Score : <span className="font-bold">{result.aggregateScorePct}%</span>
        </p>
        <p className={result.niveauMaitrise ? "text-emerald-600" : "text-amber-600"}>
          {result.niveauMaitrise
            ? "Niveau maîtrisé sur cette matière 🎉"
            : "Ce niveau nécessite encore du travail."}
        </p>
        <Link
          to={`/competence-map/${matiereId}`}
          className="rounded-lg bg-indigo-600 py-2.5 text-center font-semibold text-white hover:bg-indigo-700"
        >
          Voir ma progression détaillée
        </Link>
        <Link to={`/home?niveauId=${niveauId}`} className="text-center text-sm text-slate-500">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  const question = session.questions[index];
  if (!question) {
    return <div className="p-10 text-center text-slate-500">Chargement de la question…</div>;
  }

  async function handleChoice(competenceId: string) {
    if (feedback) return;
    setSelected(competenceId);
    const answer = await apiFetch<AnswerResponse>(
      `/diagnostic/sessions/${session!.sessionId}/answers`,
      {
        method: "POST",
        token,
        body: { questionId: question!.questionId, selectedCompetenceId: competenceId },
      },
    );
    setFeedback(answer);
  }

  async function handleNext() {
    if (index + 1 < session!.questions.length) {
      setIndex(index + 1);
      setFeedback(null);
      setSelected(null);
    } else {
      const completion = await apiFetch<CompleteResponse>(
        `/diagnostic/sessions/${session!.sessionId}/complete`,
        { method: "POST", token },
      );
      setResult(completion);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-10">
      <p className="text-sm text-slate-400">
        Question {index + 1} / {session.questions.length}
      </p>
      <h1 className="text-xl font-semibold text-slate-900">{question.prompt}</h1>

      <div className="flex flex-col gap-3">
        {question.choices.map((choice) => {
          const isSelected = selected === choice.competenceId;
          const isCorrectChoice = feedback && choice.competenceId === feedback.correctCompetenceId;
          const isWrongSelected = feedback && isSelected && !feedback.estCorrecte;

          return (
            <button
              key={choice.competenceId}
              onClick={() => handleChoice(choice.competenceId)}
              disabled={Boolean(feedback)}
              className={`rounded-xl border px-4 py-3 text-left font-medium transition ${
                isCorrectChoice
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : isWrongSelected
                    ? "border-rose-500 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-white hover:border-indigo-300"
              }`}
            >
              {choice.label}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div className="flex flex-col gap-3">
          <p
            className={
              feedback.estCorrecte
                ? "font-semibold text-emerald-600"
                : "font-semibold text-rose-600"
            }
          >
            {feedback.estCorrecte ? "✓ Bonne réponse" : "✗ Pas tout à fait"}
          </p>
          <button
            onClick={handleNext}
            className="rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700"
          >
            {index + 1 < session.questions.length ? "Question suivante" : "Voir le résultat"}
          </button>
        </div>
      )}
    </div>
  );
}
