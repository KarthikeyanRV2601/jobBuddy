import type { FocusMetric } from "../../../types/analytics";

type FocusMetricsProps = {
  readonly metrics: readonly FocusMetric[];
};

export const FocusMetrics = ({ metrics }: FocusMetricsProps) => (
  <section className="focus-strip" aria-label="Focus metrics">
    {metrics.map((metric) => (
      <article className={`focus-card tone-${metric.tone}`} key={metric.label}>
        <span>{metric.label}</span>
        <strong>{metric.value}</strong>
        <p>{metric.detail}</p>
      </article>
    ))}
  </section>
);
