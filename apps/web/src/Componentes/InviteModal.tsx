import { useEffect, useState } from "react";
import { X, Share2, MessageCircle, Mail } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { displayName } from "../lib/format";

interface Props {
  tripId: string;
  tripName?: string;
  onClose: () => void;
}

const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

export function InviteModal({ tripId, tripName, onClose }: Props) {
  const { user } = useAuth();
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailResult, setEmailResult] = useState<{ sent: boolean; to: string } | null>(null);

  useEffect(() => {
    api
      .inviteMember(tripId, undefined)
      .then((invitation) => setLink(`${window.location.origin}/invite/${invitation.token}`))
      .catch((e: any) => setError(e.message));
  }, [tripId]);

  function shareMessage() {
    const inviter = user ? displayName(user) : null;
    const intro = inviter ? `${inviter} te invitó a sumarte a` : "Te invito a sumarte a";
    return `${intro} "${tripName ?? "este proyecto"}" en La Vaquita: ${link}`;
  }

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function nativeShare() {
    if (!link) return;
    try {
      await navigator.share({ text: shareMessage() });
    } catch {
      // El usuario canceló el selector nativo — no hacer nada.
    }
  }

  function shareToWhatsApp() {
    if (!link) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage())}`, "_blank", "noopener,noreferrer");
  }

  async function sendByEmail() {
    if (!email) return;
    setEmailSubmitting(true);
    try {
      const invitation = await api.inviteMember(tripId, email);
      setEmailResult({ sent: !!invitation.emailSent, to: email });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setEmailSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Invitar participante</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        {!link ? (
          <p className="text-sm text-slate-400">Generando link de invitación...</p>
        ) : (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">Compartí este link con quien quieras sumar al proyecto:</p>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
              <span className="flex-1 truncate">{link}</span>
              <button
                onClick={copyLink}
                className="shrink-0 rounded-md bg-slate-200 px-2 py-1 font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
              >
                {copied ? "¡Copiado!" : "Copiar"}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={shareToWhatsApp}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/50"
              >
                <MessageCircle size={15} strokeWidth={2} /> WhatsApp
              </button>
              {canNativeShare && (
                <button
                  onClick={nativeShare}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/50"
                >
                  <Share2 size={15} strokeWidth={2} /> Más opciones
                </button>
              )}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-700">
              {!showEmailForm && !emailResult && (
                <button
                  onClick={() => setShowEmailForm(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
                >
                  <Mail size={14} strokeWidth={2} /> También mandarla por email
                </button>
              )}
              {showEmailForm && !emailResult && (
                <div className="flex items-center gap-2">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@ejemplo.com"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                    autoFocus
                  />
                  <button
                    onClick={sendByEmail}
                    disabled={emailSubmitting || !email}
                    className="shrink-0 rounded-lg bg-vaquita-green px-3 py-2 text-sm font-semibold text-white hover:bg-vaquita-greenDark disabled:opacity-60"
                  >
                    {emailSubmitting ? "..." : "Mandar"}
                  </button>
                </div>
              )}
              {emailResult && (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {emailResult.sent
                    ? `Le mandamos un email a ${emailResult.to}.`
                    : `No pudimos mandar el email a ${emailResult.to} — probá compartir el link directamente.`}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="mt-4 w-full rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/50"
            >
              Listo
            </button>
          </>
        )}
      </div>
    </div>
  );
}
