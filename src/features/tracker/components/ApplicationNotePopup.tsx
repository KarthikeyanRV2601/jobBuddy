import type { FormEvent } from "react";
import { useState } from "react";
import type { Application } from "../../../types/application";
import type { NoteFormValues } from "../../../types/note";

type ApplicationNotePopupProps = {
  readonly application: Application;
  readonly onClose: () => void;
  readonly onSubmit: (values: NoteFormValues) => void;
};

export const ApplicationNotePopup = ({
  application,
  onClose,
  onSubmit,
}: ApplicationNotePopupProps) => {
  const [skillContext, setSkillContext] = useState<string>(
    application.skillContext,
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit({
      title: `${application.company} skill context`,
      body: skillContext,
      tags: "skills, application-context",
      linkedApplicationId: application.id,
    });
  };

  return (
    <div className="sticky-note-backdrop" role="presentation">
      <section className="sticky-note-popup" aria-label="Application skill note">
        <div className="sticky-note-header">
          <div>
            <p className="eyebrow">Sticky note</p>
            <h3>{application.company}</h3>
            <span>{application.role}</span>
          </div>
          <button
            aria-label="Close note"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            Skills/context used while applying
            <textarea
              onChange={(event) => setSkillContext(event.target.value)}
              placeholder="Example: React, TypeScript, dashboards, Gmail API, automation..."
              rows={8}
              value={skillContext}
            />
          </label>
          <div className="form-actions">
            <button className="secondary-action" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="primary-action" type="submit">
              Save note
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
