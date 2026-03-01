"use client";

interface CompassRoseProps {
  scale: number;
}

export default function CompassRose({ scale }: CompassRoseProps) {
  return (
    <g
      transform={`translate(1480, 590) scale(${scale * 1.5})`}
      opacity={0.35}
      className="pointer-events-none"
    >
      {/* Outer star points */}
      <polygon
        points="0,-28 4,-8 24,-8 8,4 14,24 0,12 -14,24 -8,4 -24,-8 -4,-8"
        fill="none"
        stroke="#C8D0DC"
        strokeWidth={1}
      />
      {/* Inner diamond */}
      <polygon
        points="0,-14 6,0 0,14 -6,0"
        fill="none"
        stroke="#C8D0DC"
        strokeWidth={0.8}
      />
      {/* Center dot */}
      <circle cx={0} cy={0} r={2} fill="#C8D0DC" />
      {/* Cardinal lines */}
      <line x1={0} y1={-32} x2={0} y2={-28} stroke="#C8D0DC" strokeWidth={0.5} />
      <line x1={0} y1={28} x2={0} y2={32} stroke="#C8D0DC" strokeWidth={0.5} />
      <line x1={-32} y1={0} x2={-28} y2={0} stroke="#C8D0DC" strokeWidth={0.5} />
      <line x1={28} y1={0} x2={32} y2={0} stroke="#C8D0DC" strokeWidth={0.5} />
    </g>
  );
}
