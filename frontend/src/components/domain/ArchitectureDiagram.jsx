/**
 * Inline SVG pipeline diagram. Drawn natively rather than shipped as an image so
 * it reads correctly in both themes and stays sharp at any zoom.
 */
export default function ArchitectureDiagram() {
  const engines = [
    'Text model',
    'Red-flag rules',
    'Link checks',
    'UPI checks',
    'Email headers',
    'Call script',
    'Threat intel',
  ]

  const engineX = 246
  const engineW = 132
  const engineH = 30
  const gap = 8
  const startY = 26

  return (
    <div className="arch">
      <svg viewBox="0 0 880 300" width="100%" height="300" role="img" aria-labelledby="arch-title">
        <title id="arch-title">
          CREDIFY.ai pipeline: an input is analysed by seven engines in parallel, their signals are
          fused into one score, and the result is a verdict with plain-language reasons and an
          action plan.
        </title>

        <defs>
          <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L8 4 L0 8 z" className="arch__arrow" />
          </marker>
        </defs>

        {/* input */}
        <rect className="arch__box arch__box--accent" x="16" y="112" width="150" height="70" rx="12" />
        <text className="arch__label" x="91" y="140">
          Paste it
        </text>
        <text className="arch__sub" x="91" y="158">
          SMS · call · email
        </text>
        <text className="arch__sub" x="91" y="172">
          link · UPI request
        </text>

        <path className="arch__line" d="M166 147 H236" markerEnd="url(#arrow)" />

        {/* engines */}
        {engines.map((engine, index) => {
          const y = startY + index * (engineH + gap)
          return (
            <g key={engine}>
              <rect className="arch__box" x={engineX} y={y} width={engineW} height={engineH} rx="8" />
              <text className="arch__label" x={engineX + engineW / 2} y={y + 19} style={{ fontSize: 11 }}>
                {engine}
              </text>
              <path
                className="arch__line"
                d={`M${engineX + engineW} ${y + engineH / 2} H${engineX + engineW + 34} V147`}
                opacity="0.55"
              />
            </g>
          )
        })}
        <text className="arch__sub" x={engineX + engineW / 2} y="16">
          SEVEN SIGNAL ENGINES, RUN IN PARALLEL
        </text>

        <path className="arch__line" d="M412 147 H472" markerEnd="url(#arrow)" />

        {/* fusion */}
        <rect className="arch__box arch__box--accent" x="472" y="107" width="140" height="80" rx="12" />
        <text className="arch__label" x="542" y="134">
          Fusion
        </text>
        <text className="arch__sub" x="542" y="152">
          weighs and combines
        </text>
        <text className="arch__sub" x="542" y="166">
          every signal
        </text>
        <text className="arch__sub" x="542" y="180">
          into one score
        </text>

        <path className="arch__line" d="M612 147 H672" markerEnd="url(#arrow)" />

        {/* verdict */}
        <rect className="arch__box" x="672" y="72" width="180" height="50" rx="10" />
        <text className="arch__label" x="762" y="93">
          Verdict + score
        </text>
        <text className="arch__sub" x="762" y="110">
          Safe · Suspicious · High Risk
        </text>

        <rect className="arch__box" x="672" y="130" width="180" height="50" rx="10" />
        <text className="arch__label" x="762" y="151">
          Why we flagged it
        </text>
        <text className="arch__sub" x="762" y="168">
          plain-language reasons
        </text>

        <rect className="arch__box" x="672" y="188" width="180" height="50" rx="10" />
        <text className="arch__label" x="762" y="209">
          What to do now
        </text>
        <text className="arch__sub" x="762" y="226">
          do / do not, and where to report
        </text>

        <path className="arch__line" d="M660 147 V97 H672" markerEnd="url(#arrow)" opacity="0.6" />
        <path className="arch__line" d="M660 147 V213 H672" markerEnd="url(#arrow)" opacity="0.6" />

        {/* feedback loop */}
        <path
          className="arch__line"
          d="M762 238 V266 H246 V246"
          strokeDasharray="5 4"
          markerEnd="url(#arrow)"
          opacity="0.7"
        />
        <text className="arch__sub" x="500" y="282">
          confirmed scams feed the shared threat-intel blocklist
        </text>
      </svg>
    </div>
  )
}
