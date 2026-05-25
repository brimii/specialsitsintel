import { GLOS } from "@/app/data/content";

export default function GlossaryPage() {
  return (
    <div className="page active" id="page-glossary">
      <div className="page-shell">
        <div className="page-hero">
          <div>
            <div className="hero-eyebrow">Terminology</div>
            <h1 className="hero-h">
              Event-Driven
              <br />
              <em>Glossary.</em>
            </h1>
          </div>
          <div>
            <p className="hero-sub">
              Every term a merger arb analyst, activist investor, or distressed PM needs — defined
              with precision, quantitative context, and cross-references to live deal examples.
            </p>
          </div>
        </div>

        <div className="glos-grid stagger" id="ggrid">
          {GLOS.map((g) => (
            <div className="glos-card" key={g.t}>
              <div className="glos-card-term">{g.t}</div>
              <div className="glos-card-def">{g.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
