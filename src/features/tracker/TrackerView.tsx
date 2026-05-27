import { useMemo, useState } from "react";
import { ApplicationForm } from "./components/ApplicationForm";
import { ApplicationList } from "./components/ApplicationList";
import { ApplicationNotePopup } from "./components/ApplicationNotePopup";
import { TrackerToolbar } from "./components/TrackerToolbar";
import type {
  Application,
  ApplicationFilters,
  ApplicationFormValues,
} from "../../types/application";
import type { Note, NoteFormValues } from "../../types/note";
import {
  getDefaultApplicationFilters,
  getApplicationFilterCards,
  updateApplicationQuery,
  updateApplicationStatusFilter,
} from "../../utils/applicationFilters";
import {
  createApplication,
  deleteApplication,
  filterApplications,
  getApplicationById,
  getSampleApplications,
  upsertApplication,
} from "../../utils/applications";
import { addNote, createNote } from "../../utils/notes";

type TrackerViewProps = {
  readonly applications: readonly Application[];
  readonly notes: readonly Note[];
  readonly onApplicationsChange: (applications: readonly Application[]) => void;
  readonly onNotesChange: (notes: readonly Note[]) => void;
};

export const TrackerView = ({
  applications,
  notes,
  onApplicationsChange,
  onNotesChange,
}: TrackerViewProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteApplicationId, setNoteApplicationId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ApplicationFilters>(
    getDefaultApplicationFilters,
  );

  const editingApplication = useMemo(
    () => getApplicationById(applications, editingId),
    [applications, editingId],
  );

  const filteredApplications = useMemo(
    () => filterApplications(applications, filters),
    [applications, filters],
  );
  const noteApplication = useMemo(
    () => getApplicationById(applications, noteApplicationId),
    [applications, noteApplicationId],
  );
  const filterCards = useMemo(
    () => getApplicationFilterCards(applications),
    [applications],
  );

  const handleSubmit = (values: ApplicationFormValues): void => {
    if (editingApplication === null) {
      return;
    }

    const nowIso = new Date().toISOString();
    const application = createApplication(
      {
        ...values,
        id: editingApplication.id,
        existingCreatedAt: editingApplication.createdAt,
      },
      nowIso,
    );

    onApplicationsChange(upsertApplication(applications, application));
    setEditingId(null);
  };

  const handleSeedDemo = (): void => {
    if (applications.length > 0) {
      return;
    }

    onApplicationsChange(getSampleApplications(new Date().toISOString()));
  };

  const handleNoteSubmit = (values: NoteFormValues): void => {
    onNotesChange(addNote(notes, createNote(values, new Date().toISOString())));
    setNoteApplicationId(null);
  };

  return (
    <section aria-labelledby="tracker-title">
      <header className="page-header">
        <div>
          <p className="eyebrow">Lead and application tracker</p>
          <h2 id="tracker-title">Tracker</h2>
        </div>
        <button className="primary-action" onClick={handleSeedDemo} type="button">
          Load sample
        </button>
      </header>

      <TrackerToolbar
        filterCards={filterCards}
        filters={filters}
        onQueryChange={(query) =>
          setFilters((current) => updateApplicationQuery(current, query))
        }
        onStatusChange={(status) =>
          setFilters((current) =>
            updateApplicationStatusFilter(current, status),
          )
        }
      />

      <ApplicationList
        applications={filteredApplications}
        onDelete={(id) =>
          onApplicationsChange(deleteApplication(applications, id))
        }
        onEdit={setEditingId}
        onOpenNotes={setNoteApplicationId}
      />

      {noteApplication === null ? null : (
        <ApplicationNotePopup
          application={noteApplication}
          onClose={() => setNoteApplicationId(null)}
          onSubmit={handleNoteSubmit}
        />
      )}

      {editingApplication === null ? null : (
        <div className="edit-popup-backdrop" role="presentation">
          <section className="edit-popup" aria-label="Edit application">
            <div className="sticky-note-header">
              <div>
                <p className="eyebrow">Edit application</p>
                <h3>{editingApplication.company}</h3>
                <span>{editingApplication.role}</span>
              </div>
              <button
                aria-label="Close edit"
                className="icon-button"
                onClick={() => setEditingId(null)}
                type="button"
              >
                ×
              </button>
            </div>
            <ApplicationForm
              editingApplication={editingApplication}
              onCancelEdit={() => setEditingId(null)}
              onSubmit={handleSubmit}
            />
          </section>
        </div>
      )}
    </section>
  );
};
