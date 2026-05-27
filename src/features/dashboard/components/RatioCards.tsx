import type { RatioMetric } from "../../../types/analytics";

type RatioCardsProps = {
  readonly ratios: readonly RatioMetric[];
};

export const RatioCards = ({ ratios }: RatioCardsProps) => (
  <section className="ratio-grid" aria-label="Application ratios">
    {ratios.map((ratio) => (
      <article className="ratio-card" key={ratio.label}>
        <div>
          <span>{ratio.label}</span>
          <strong>{ratio.percentage}%</strong>
        </div>
        <div className="ratio-track" aria-hidden="true">
          <span style={{ width: `${ratio.percentage}%` }} />
        </div>
        <p>
          {ratio.value} of {ratio.total || 0}
        </p>
      </article>
    ))}
  </section>
);
