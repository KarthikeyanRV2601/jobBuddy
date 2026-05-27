import type { EmailSignal } from "../../../types/email";
import { formatDateTime } from "../../../utils/dateFormat";
import { getGmailUrl } from "../../../utils/gmailLinks";
import { getStatusPillClassName } from "../../../utils/statusClassNames";

type EmailHistoryProps = {
  readonly signals: readonly EmailSignal[];
  readonly onClear: () => void;
  readonly onClearAllLocalData: () => void;
};

export const EmailHistory = ({
  signals,
  onClear,
  onClearAllLocalData,
}: EmailHistoryProps) => (
  <section className="email-history">
    <div className="section-heading">
      <h3>Recent email signals</h3>
      <div className="data-actions">
        <button className="secondary-action" onClick={onClear} type="button">
          Clear email cache
        </button>
        <button
          className="danger-action"
          onClick={onClearAllLocalData}
          type="button"
        >
          Clear all local data
        </button>
      </div>
    </div>
    <div className="history-list">
      {signals.length === 0 ? (
        <div className="empty-state">Analyzed emails will appear here.</div>
      ) : (
        signals.map((signal) => {
          const gmailUrl = getGmailUrl(signal);
          return (
            <a
              className="history-item history-link"
              href={gmailUrl || undefined}
              key={signal.id}
              rel="noreferrer"
              target="_blank"
            >
              <div>
                <span className={getStatusPillClassName(signal.status)}>
                  {signal.status}
                </span>
                <span className="meta-line">{formatDateTime(signal.createdAt)}</span>
              </div>
              <strong>{signal.subject}</strong>
              {signal.insight === undefined ? null : (
                <span className="signal-insight">{signal.insight}</span>
              )}
              {signal.evidence === undefined || signal.evidence.length === 0 ? null : (
                <span className="signal-evidence">
                  Evidence: {signal.evidence.join(", ")}
                </span>
              )}
              <span className="meta-line">
                {signal.confidence}% confidence · {signal.recommendation}
              </span>
            </a>
          );
        })
      )}
    </div>
  </section>
);
