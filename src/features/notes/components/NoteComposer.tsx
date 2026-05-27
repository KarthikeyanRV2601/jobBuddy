import type { FormEvent } from "react";
import { useState } from "react";
import type { Application } from "../../../types/application";
import type { NoteFormValues } from "../../../types/note";
import { getEmptyNoteFormValues } from "../../../utils/notes";

type NoteComposerProps = {
  readonly applications: readonly Application[];
  readonly onSubmit: (values: NoteFormValues) => void;
};

export const NoteComposer = ({
  applications,
  onSubmit,
}: NoteComposerProps) => {
  const [values, setValues] = useState<NoteFormValues>(getEmptyNoteFormValues);

  const updateValue = <Key extends keyof NoteFormValues>(
    key: Key,
    value: NoteFormValues[Key],
  ): void => {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit(values);
    setValues(getEmptyNoteFormValues());
  };

  return (
    <section className="note-composer">
      <form onSubmit={handleSubmit}>
        <div className="note-field-grid">
          <label>
            Title
            <input
              onChange={(event) => updateValue("title", event.target.value)}
              placeholder="Interview prep, recruiter detail, follow-up idea"
              required
              value={values.title}
            />
          </label>
          <label>
            Link to application
            <select
              onChange={(event) =>
                updateValue("linkedApplicationId", event.target.value)
              }
              value={values.linkedApplicationId}
            >
              <option value="">General note</option>
              {applications.map((application) => (
                <option key={application.id} value={application.id}>
                  {application.company} · {application.role}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tags
            <input
              onChange={(event) => updateValue("tags", event.target.value)}
              placeholder="prep, salary, referral"
              value={values.tags}
            />
          </label>
        </div>
        <label className="wide-field">
          Note
          <textarea
            onChange={(event) => updateValue("body", event.target.value)}
            placeholder="Save useful context, exact phrasing, recruiter notes, interview learnings"
            rows={5}
            value={values.body}
          />
        </label>
        <div className="form-actions">
          <button className="primary-action" type="submit">
            Add to canvas
          </button>
        </div>
      </form>
    </section>
  );
};
