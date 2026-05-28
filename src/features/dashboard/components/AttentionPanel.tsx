import type {
  AttentionItem,
  AttentionSummary,
} from "../../../utils/emailTriage";
import { getGmailUrl } from "../../../utils/gmailLinks";
import { getStatusPillClassName } from "../../../utils/statusClassNames";

type AttentionPanelProps = {
  readonly items: readonly AttentionItem[];
  readonly summary: AttentionSummary;
};

export const AttentionPanel = ({ items, summary }: AttentionPanelProps) => (
  <aside className="dashboard-panel attention-panel" aria-label="Needs attention">
    <div className="section-heading compact-heading">
      <div>
        <h3>Needs attention</h3>
        <span className="meta-line">
          {items.length} recent {items.length === 1 ? "message" : "messages"}
        </span>
      </div>
      <span className="attention-count">{summary.highPriorityCount} high</span>
    </div>
    <div className="attention-list">
      {items.length === 0 ? (
        <div className="empty-state empty-state-quiet">
          <strong>Attention queue is clear</strong>
          <span>No application mail needs action right now.</span>
        </div>
      ) : (
        items.map((item) => {
          const gmailUrl = getGmailUrl(item.signal);

          return (
            <article
              className={`attention-item is-${item.priority}`}
              key={item.id}
            >
              <div className="attention-item-top">
                <span className="attention-category">{item.category}</span>
                <span className="attention-age">{item.ageLabel}</span>
              </div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              <div className="attention-reason">{item.reason}</div>
              <div className="attention-actions">
                <span className={getStatusPillClassName(item.signal.status)}>
                  {item.signal.status}
                </span>
                <span className="confidence-label">
                  {item.signal.confidence}%
                </span>
                {gmailUrl.length > 0 ? (
                  <a href={gmailUrl} rel="noreferrer" target="_blank">
                    {item.actionLabel}
                  </a>
                ) : (
                  <span className="muted-action">{item.actionLabel}</span>
                )}
              </div>
            </article>
          );
        })
      )}
    </div>
  </aside>
);
