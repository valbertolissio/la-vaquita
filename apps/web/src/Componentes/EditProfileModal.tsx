import { FormEvent, useState } from "react";
import { X, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AVATAR_COLOR_KEYS, AvatarColorKey, avatarColor, initials } from "../lib/format";

interface EditProfileModalProps {
  onClose: () => void;
}

export function EditProfileModal({ onClose }: EditProfileModalProps) {
  const { user, updateProfile } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [color, setColor] = useState<AvatarColorKey | null>((user?.avatarColor as AvatarColorKey) ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateProfile({ nickname: nickname.trim() || null, avatarColor: color });
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const previewName = nickname.trim() || user.name;
  const previewColor = color ? avatarColor(user.id, color) : avatarColor(user.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Editar perfil</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>

        <div className="mb-5 flex justify-center">
          <span className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold ${previewColor.bg} ${previewColor.text}`}>
            {initials(previewName)}
          </span>
        </div>

        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Sobrenombre</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={user.name}
          maxLength={30}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
        />

        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Color del avatar</label>
        <div className="mb-5 flex flex-wrap gap-2">
          {AVATAR_COLOR_KEYS.map((key) => {
            const c = avatarColor(user.id, key);
            const selected = color === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setColor(key)}
                className={`flex h-9 w-9 items-center justify-center rounded-full ${c.bg} ${
                  selected ? "ring-2 ring-offset-2 ring-slate-400" : ""
                }`}
                aria-label={key}
              >
                {selected && <Check size={16} className="text-white" strokeWidth={3} />}
              </button>
            );
          })}
        </div>

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-vaquita-green px-4 py-2 text-sm font-semibold text-white hover:bg-vaquita-greenDark disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}
