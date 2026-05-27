import type { SourceBreakdownItem } from "../../../types/analytics";
import { getLargestSourceCount } from "../../../utils/analytics";

type SourceChartProps = {
  readonly sources: readonly SourceBreakdownItem[];
};

export const SourceChart = ({ sources }: SourceChartProps) => {
  const maxCount = getLargestSourceCount(sources);

  return (
    <section className="dashboard-panel source-panel">
      <div className="section-heading compact-heading">
        <h3>Source quality</h3>
      </div>
      <div className="source-bars">
        {sources.length === 0 ? (
          <div className="empty-state">No source data yet.</div>
        ) : (
          sources.map((source) => (
            <div className="source-row" key={source.source}>
              <span>{source.source}</span>
              <div className="source-track">
                <span style={{ width: `${(source.count / maxCount) * 100}%` }} />
              </div>
              <strong>{source.count}</strong>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
