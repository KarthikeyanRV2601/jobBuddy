import type { EmailSignal } from "../../../types/email";
import { getGmailUrl } from "../../../utils/gmailLinks";
import { getStatusPillClassName } from "../../../utils/statusClassNames";

type TriageQueueProps = {
  readonly signals: readonly EmailSignal[];
};

export const TriageQueue = ({ signals }: TriageQueueProps) => (
  <section className="dashboard-panel triage-panel">
    <div className="section-heading compact-heading">
      <h3>Review queue</h3>
      <span className="meta-line">{signals.length} needs review</span>
    </div>
    <div className="triage-list">
      {signals.length === 0 ? (
        <div className="empty-state">No low-confidence email updates.</div>
      ) : (
        signals.map((signal) => {
          const gmailUrl = getGmailUrl(signal);
          return (
            <article className="triage-item" key={signal.id}>
              <span className={getStatusPillClassName(signal.status)}>
                {signal.status}
              </span>
              <div>
                <strong>{signal.subject}</strong>
                <span>{signal.insight ?? signal.recommendation}</span>
              </div>
              <strong>{signal.confidence}%</strong>
              {gmailUrl.length > 0 ? (
                <a href={gmailUrl} rel="noreferrer" target="_blank">
                  Open
                </a>
              ) : null}
            </article>
          );
        })
      )}
    </div>
  </section>
);
