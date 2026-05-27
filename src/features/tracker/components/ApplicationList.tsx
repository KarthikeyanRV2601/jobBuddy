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
        <div className="empty-state">No applications match this view yet.</div>
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
                      <a href={gmailUrl} rel="noreferrer" target="_blank">
                        Email
                      </a>
                    ) : null}
                    <button onClick={() => onOpenNotes(application.id)} type="button">
                      Skills
                    </button>
                    <button onClick={() => onEdit(application.id)} type="button">
                      Edit
                    </button>
                    <button onClick={() => onDelete(application.id)} type="button">
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
