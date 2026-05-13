import { getBaseUrl } from "../services/api";

const GRADIENTS = [
  "from-teal-400 to-cyan-400",
  "from-purple-400 to-pink-400",
  "from-amber-400 to-orange-400",
  "from-sky-400 to-blue-400",
  "from-emerald-400 to-green-400",
  "from-rose-400 to-red-400",
];

function getGradient(name) {
  const code = (name || "U").charCodeAt(0);
  return GRADIENTS[code % GRADIENTS.length];
}

export default function Avatar({ user, size = 36, className = "", onClick }) {
  const name = user?.displayName || user?.username || "U";
  const initial = name.charAt(0).toUpperCase();
  const avatar = user?.avatar;
  const gradient = getGradient(name);
  const baseUrl = getBaseUrl();

  const style = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    fontSize: size * 0.42,
  };

  if (avatar) {
    const src = avatar.startsWith("http") ? avatar : `${baseUrl}${avatar}`;
    return (
      <img
        src={src}
        alt={name}
        onClick={onClick}
        style={style}
        className={`rounded-full object-cover cursor-pointer ${className}`}
      />
    );
  }

  return (
    <div
      onClick={onClick}
      style={style}
      className={`rounded-full bg-gradient-to-r ${gradient} flex items-center justify-center cursor-pointer select-none ${className}`}
    >
      <span className="text-black font-bold leading-none">{initial}</span>
    </div>
  );
}
