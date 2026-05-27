import type { Application } from "../../../types/application";
import { formatDate } from "../../../utils/dateFormat";
import { getGmailUrl } from "../../../utils/gmailLinks";
import { getStatusPillClassName } from "../../../utils/statusClassNames";

type ApplicationCardProps = {
  readonly application: Application;
  readonly onDelete: (id: string) => void;
  readonly onEdit: (id: string) => void;
  readonly onOpenNotes: (id: string) => void;
};

export const ApplicationCard = ({
  application,
  onDelete,
  onEdit,
  onOpenNotes,
}: ApplicationCardProps) => {
  const gmailUrl = getGmailUrl(application);

  return (
    <article className="application-card">
      <div>
        <div className="card-title">
          <h3>
            {application.company} · {application.role}
          </h3>
          <span className={getStatusPillClassName(application.status)}>
            {application.status}
          </span>
        </div>
        <div className="meta-line">
          {application.source || "No source saved"}
          {application.deadline === ""
            ? ""
            : ` · Due ${formatDate(application.deadline)}`}
        </div>
        <div className="card-body">
          <div>
            <strong>Next:</strong>{" "}
            {application.nextAction || "No next action saved"}
          </div>
          <div>
            <strong>Notes:</strong> {application.notes || "No notes yet"}
          </div>
          <div>
            <strong>Skill context:</strong>{" "}
            {application.skillContext || "No skill context saved"}
          </div>
        </div>
      </div>
      <div className="card-actions">
        {gmailUrl.length > 0 ? (
          <a className="icon-link" href={gmailUrl} rel="noreferrer" target="_blank">
            @
          </a>
        ) : null}
        <button
          aria-label="Add application note"
          className="icon-button"
          onClick={() => onOpenNotes(application.id)}
          title="Add skill note"
          type="button"
        >
          ✎
        </button>
        <button
          aria-label="Edit application"
          className="icon-button"
          onClick={() => onEdit(application.id)}
          title="Edit application"
          type="button"
        >
          ✎
        </button>
        <button
          aria-label="Delete application"
          className="icon-button"
          onClick={() => onDelete(application.id)}
          title="Delete application"
          type="button"
        >
          ×
        </button>
      </div>
    </article>
  );
};
