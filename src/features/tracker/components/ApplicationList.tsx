import type { Application } from "../../../types/application";
import { formatDate } from "../../../utils/dateFormat";
import { getGmailUrl } from "../../../utils/gmailLinks";
import { getStatusPillClassName } from "../../../utils/statusClassNames";

type ApplicationListProps = {
  readonly applications: readonly Application[];
  readonly onDelete: (id: string) => void;
  readonly onEdit: (id: string) => void;
  readonly onOpenNotes: (id: string) => void;
};

export const ApplicationList = ({
  applications,
  onDelete,
  onEdit,
  onOpenNotes,
}: ApplicationListProps) => {
  if (applications.length === 0) {
    return (
      <section className="application-list" aria-live="polite">
        <div className="empty-state empty-state-quiet">
          <strong>No applications match this view</strong>
          <span>Try another status filter or sync Gmail to populate the tracker.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="crm-table-wrap" aria-live="polite">
      <table className="crm-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Role</th>
            <th>Status</th>
            <th>Next action</th>
            <th>Source</th>
            <th>Deadline</th>
            <th>Skill context</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => {
            const gmailUrl = getGmailUrl(application);
            return (
              <tr key={application.id}>
                <td>
                  <strong className="cell-truncate" title={application.company}>
                    {application.company}
                  </strong>
                </td>
                <td>
                  <span className="cell-truncate" title={application.role}>
                    {application.role}
                  </span>
                </td>
                <td>
                  <span className={getStatusPillClassName(application.status)}>
                    {application.status}
                  </span>
                </td>
                <td>
                  <span
                    className="cell-clamp"
                    title={application.nextAction || "No next action"}
                  >
                    {application.nextAction || "No next action"}
                  </span>
                </td>
                <td>
                  <span
                    className="cell-truncate"
                    title={application.source || "Manual"}
                  >
                    {application.source || "Manual"}
                  </span>
                </td>
                <td>
                  <span className="cell-truncate">
                    {application.deadline === ""
                      ? "Not set"
                      : formatDate(application.deadline)}
                  </span>
                </td>
                <td>
                  <span
                    className="cell-clamp"
                    title={application.skillContext || "Not captured"}
                  >
                    {application.skillContext || "Not captured"}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    {gmailUrl.length > 0 ? (
                      <a
                        aria-label={`Open email for ${application.company}`}
                        href={gmailUrl}
                        rel="noreferrer"
                        target="_blank"
                        title="Open source email"
                      >
                        Email
                      </a>
                    ) : null}
                    <button
                      onClick={() => onOpenNotes(application.id)}
                      title="Save skill context"
                      type="button"
                    >
                      Skills
                    </button>
                    <button
                      onClick={() => onEdit(application.id)}
                      title="Edit application"
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="danger-table-action"
                      onClick={() => onDelete(application.id)}
                      title="Delete application"
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
};
