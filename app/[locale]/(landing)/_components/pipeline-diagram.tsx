// Server component — pure SVG with native SVG animateMotion (no JS needed)

interface PipelineDiagramProps {
  zoneLabel: string;
  clientTrack: string[];
  proTrack: string[];
  clientSub: string;
  proSub: string;
}

export function PipelineDiagram({
  zoneLabel,
  clientTrack,
  proTrack,
  clientSub,
  proSub,
}: PipelineDiagramProps) {
  const teal = "rgba(13,148,136,";
  const green = "rgba(16,185,129,";

  type NodeVariant = "neutral" | "teal" | "green";
  type TrackNode = { x: number; label: string; variant: NodeVariant; sub?: string };

  const pw = 62, ph = 26, pr = 13;
  const xs = [44, 158, 276, 392];
  const ay = 78, by = 155;

  const tracks: { y: number; nodes: TrackNode[] }[] = [
    {
      y: by,
      nodes: [
        { x: xs[0], label: proTrack[0],    variant: "neutral", sub: proSub },
        { x: xs[1], label: proTrack[1],    variant: "teal" },
        { x: xs[2], label: proTrack[2],    variant: "teal" },
        { x: xs[3], label: proTrack[3],    variant: "green" },
      ],
    },
    {
      y: ay,
      nodes: [
        { x: xs[0], label: clientTrack[0], variant: "neutral", sub: clientSub },
        { x: xs[1], label: clientTrack[1], variant: "teal" },
        { x: xs[2], label: clientTrack[2], variant: "teal" },
        { x: xs[3], label: clientTrack[3], variant: "green" },
      ],
    },
  ];

  return (
    <svg
      viewBox="0 0 444 222"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full"
      aria-hidden
    >
      {/* ReadyKare zone bracket */}
      <rect x="114" y="46" width="198" height="141" rx="14"
        fill={`${teal}0.07)`} stroke={`${teal}0.22)`}
        strokeWidth="1.2" strokeDasharray="5 3" />
      <text x="213" y="38" textAnchor="middle" fontSize="8" fontWeight="700"
        fill={`${teal}1)`} letterSpacing="2"
        fontFamily="system-ui, -apple-system, sans-serif">{zoneLabel}</text>

      {tracks.map(({ y, nodes }) => (
        <g key={`track-${y}`}>
          {/* Connector lines + arrows — static */}
          {nodes.slice(0, -1).map((node, i) => {
            const x1 = node.x + pw / 2;
            const x2 = nodes[i + 1].x - pw / 2;
            const isTeal = node.variant === "teal";
            // travel distance for animateMotion path
            const segLen = x2 - x1;
            // stagger: top-track segments get a slight offset from bottom-track
            const trackOffset = y === ay ? 0 : 0.2;
            const beginA = `${i * 0.5 + trackOffset}s`;
            const beginB = `${i * 0.5 + trackOffset + 0.8}s`;

            return (
              <g key={`conn-${y}-${i}`}>
                {/* Static line */}
                <line
                  x1={x1} y1={y} x2={x2} y2={y}
                  stroke={isTeal ? `${teal}0.5)` : "currentColor"}
                  strokeOpacity={isTeal ? undefined : "0.18"}
                  strokeWidth={isTeal ? 1.5 : 1.2}
                  strokeDasharray={isTeal ? undefined : "3 2"}
                />

                {/* Animated pulse dots — only on teal segments */}
                {isTeal && (
                  <>
                    {/* dot A */}
                    <circle cx={x1} cy={y} r="3" fill={`${teal}0.9)`}>
                      <animateMotion
                        dur="1.6s"
                        repeatCount="indefinite"
                        begin={beginA}
                        path={`M0,0 L${segLen},0`}
                        calcMode="spline"
                        keyPoints="0;1"
                        keyTimes="0;1"
                        keySplines="0.35 0 0.65 1"
                      />
                      <animate
                        attributeName="opacity"
                        values="0;1;1;0"
                        keyTimes="0;0.08;0.85;1"
                        dur="1.6s"
                        repeatCount="indefinite"
                        begin={beginA}
                      />
                    </circle>
                    {/* dot B — offset by half cycle */}
                    <circle cx={x1} cy={y} r="3" fill={`${teal}0.9)`}>
                      <animateMotion
                        dur="1.6s"
                        repeatCount="indefinite"
                        begin={beginB}
                        path={`M0,0 L${segLen},0`}
                        calcMode="spline"
                        keyPoints="0;1"
                        keyTimes="0;1"
                        keySplines="0.35 0 0.65 1"
                      />
                      <animate
                        attributeName="opacity"
                        values="0;1;1;0"
                        keyTimes="0;0.08;0.85;1"
                        dur="1.6s"
                        repeatCount="indefinite"
                        begin={beginB}
                      />
                    </circle>
                  </>
                )}
              </g>
            );
          })}

          {/* Pill nodes */}
          {nodes.map((node) => {
            const fill =
              node.variant === "teal"  ? `${teal}0.12)` :
              node.variant === "green" ? `${green}0.12)` : "transparent";
            const stroke =
              node.variant === "teal"  ? `${teal}0.42)` :
              node.variant === "green" ? `${green}0.42)` : "currentColor";
            const strokeOp  = node.variant === "neutral" ? "0.2"  : undefined;
            const textFill  =
              node.variant === "teal"  ? `${teal}0.9)` :
              node.variant === "green" ? `${green}0.9)` : "currentColor";
            const textOp    = node.variant === "neutral" ? "0.55" : undefined;

            return (
              <g key={`node-${y}-${node.label}`}>
                <rect
                  x={node.x - pw / 2} y={y - ph / 2}
                  width={pw} height={ph} rx={pr}
                  fill={fill} stroke={stroke}
                  strokeOpacity={strokeOp} strokeWidth="1.5"
                />
                <text
                  x={node.x} y={y + 4.5}
                  textAnchor="middle" fontSize="8.5" fontWeight="600"
                  fill={textFill} fillOpacity={textOp}
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {node.label}
                </text>
                {node.sub && (
                  <text
                    x={node.x} y={y + ph / 2 + 13}
                    textAnchor="middle" fontSize="7.5"
                    fill="currentColor" fillOpacity="0.3"
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {node.sub}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}
