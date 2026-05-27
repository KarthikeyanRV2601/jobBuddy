import { useState } from "react";
import { NoteComposer } from "./components/NoteComposer";
import { NotesList } from "./components/NotesList";
import type { Application } from "../../types/application";
import type { Note, NoteFormValues } from "../../types/note";
import { addNote, createNote, deleteNote } from "../../utils/notes";

type NotesViewProps = {
  readonly applications: readonly Application[];
  readonly notes: readonly Note[];
  readonly onNotesChange: (notes: readonly Note[]) => void;
};

export const NotesView = ({
  applications,
  notes,
  onNotesChange,
}: NotesViewProps) => {
  const [query, setQuery] = useState<string>("");

  const handleSubmit = (values: NoteFormValues): void => {
    const note = createNote(values, new Date().toISOString());
    onNotesChange(addNote(notes, note));
  };

  const filteredNotes = notes.filter((note) =>
    [note.title, note.body, note.tags.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <section aria-labelledby="notes-title">
      <header className="page-header">
        <div>
          <p className="eyebrow">Canvas notes</p>
          <h2 id="notes-title">Map the job-search context</h2>
        </div>
      </header>

      <section className="notes-workspace">
        <aside className="notes-dock">
          <NoteComposer applications={applications} onSubmit={handleSubmit} />
          <label className="search-field">
            Search notes
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, body, tags"
              type="search"
              value={query}
            />
          </label>
        </aside>

        <NotesList
          applications={applications}
          notes={filteredNotes}
          onDelete={(id) => onNotesChange(deleteNote(notes, id))}
        />
      </section>
    </section>
  );
};
