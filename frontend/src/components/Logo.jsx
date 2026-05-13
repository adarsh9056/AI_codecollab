export default function Logo({ size = 24 }) {
  return (
    <div
      style={{ fontSize: size }}
      className="font-semibold tracking-wide select-none"
    >
      <span className="text-teal-700">&lt;</span>

      <span className="text-white">Code</span>

      <span className="bg-teal-700 bg-clip-text text-transparent">
        Collab
      </span>

      <span className="text-teal-700">/&gt;</span>
    </div>
  );
}
