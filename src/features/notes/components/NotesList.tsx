import type { Application } from "../../../types/application";
import type { Note } from "../../../types/note";
import { formatDateTime } from "../../../utils/dateFormat";
import { getLinkedApplicationLabel } from "../../../utils/notes";

type NotesListProps = {
  readonly applications: readonly Application[];
  readonly notes: readonly Note[];
  readonly onDelete: (id: string) => void;
};

export const NotesList = ({
  applications,
  notes,
  onDelete,
}: NotesListProps) => {
  if (notes.length === 0) {
    return (
      <section className="notes-canvas">
        <div className="empty-state">No notes on the canvas yet.</div>
      </section>
    );
  }

  return (
    <section className="notes-canvas" aria-live="polite">
      {notes.map((note, index) => (
        <article
          className="note-card"
          key={note.id}
          style={{
            marginLeft: `${(index % 3) * 22}px`,
            marginTop: `${(index % 4) * 10}px`,
          }}
        >
          <div className="note-card-header">
            <div>
              <h3>{note.title}</h3>
              <span className="meta-line">
                {getLinkedApplicationLabel(note.linkedApplicationId, applications)}
              </span>
            </div>
            <button
              aria-label="Delete note"
              className="icon-button"
              onClick={() => onDelete(note.id)}
              type="button"
            >
              ×
            </button>
          </div>
          <p>{note.body || "No note body saved."}</p>
          <div className="note-footer">
            <div className="keyword-list">
              {note.tags.map((tag) => (
                <span className="pill" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            <span className="meta-line">{formatDateTime(note.updatedAt)}</span>
          </div>
        </article>
      ))}
    </section>
  );
};
