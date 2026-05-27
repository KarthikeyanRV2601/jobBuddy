import type { EmailSignal } from "../../../types/email";
import { getStatusPillClassName } from "../../../utils/statusClassNames";

type EmailAnalysisPanelProps = {
  readonly signal: EmailSignal | null;
};

export const EmailAnalysisPanel = ({ signal }: EmailAnalysisPanelProps) => (
  <section className="analysis-panel" aria-live="polite">
    <h3>Detected signal</h3>
    {signal === null ? (
      <div className="empty-state">No email analyzed yet.</div>
    ) : (
      <div className="analysis-result">
        <span className={getStatusPillClassName(signal.status)}>
          {signal.status}
        </span>
        <div className="signal-score">{signal.confidence}%</div>
        <p>{signal.recommendation}</p>
        <div className="keyword-list">
          {signal.keywords.length === 0 ? (
            <span className="pill">manual review</span>
          ) : (
            signal.keywords.map((keyword) => (
              <span className="pill" key={keyword}>
                {keyword}
              </span>
            ))
          )}
        </div>
      </div>
    )}
  </section>
);
