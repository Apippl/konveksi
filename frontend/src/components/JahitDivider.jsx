// Strip pemisah section: jahitan zigzag tipis, benang merah tema bordir.
const TITIK = (() => {
  const p = [];
  let atas = false;
  for (let x = 0; x <= 100; x += 4) {
    p.push(`${x},${atas ? 2.5 : 9.5}`);
    atas = !atas;
  }
  return p.join(" ");
})();

export default function JahitDivider() {
  return (
    <div aria-hidden="true" className="my-6">
      <svg viewBox="0 0 100 12" preserveAspectRatio="none" className="block w-full h-[14px]">
        <polyline
          points={TITIK}
          fill="none"
          stroke="rgba(91,114,201,0.55)"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="3 2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
