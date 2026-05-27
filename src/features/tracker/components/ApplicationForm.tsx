import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  APPLICATION_STATUSES,
  type Application,
  type ApplicationFormValues,
} from "../../../types/application";
import {
  applicationToFormValues,
  getEmptyApplicationFormValues,
  normalizeApplicationFormValues,
  toApplicationStatus,
} from "../../../utils/applicationForms";

type ApplicationFormProps = {
  readonly editingApplication: Application | null;
  readonly onCancelEdit: () => void;
  readonly onSubmit: (values: ApplicationFormValues) => void;
};

export const ApplicationForm = ({
  editingApplication,
  onCancelEdit,
  onSubmit,
}: ApplicationFormProps) => {
  const [values, setValues] = useState<ApplicationFormValues>(
    getEmptyApplicationFormValues,
  );

  useEffect(() => {
    if (editingApplication === null) {
      setValues(getEmptyApplicationFormValues());
      return;
    }

    setValues(applicationToFormValues(editingApplication));
  }, [editingApplication]);

  const updateValue = <Key extends keyof ApplicationFormValues>(
    key: Key,
    value: ApplicationFormValues[Key],
  ): void => {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit(normalizeApplicationFormValues(values));
    setValues(getEmptyApplicationFormValues());
  };

  const handleClear = (): void => {
    setValues(getEmptyApplicationFormValues());
    onCancelEdit();
  };

  return (
    <section className="form-panel edit-form-panel" aria-label="Edit application fields">
      <form onSubmit={handleSubmit}>
        <div className="field-grid">
          <label>
            Company
            <input
              autoComplete="organization"
              onChange={(event) => updateValue("company", event.target.value)}
              required
              value={values.company}
            />
          </label>
          <label>
            Role
            <input
              autoComplete="off"
              onChange={(event) => updateValue("role", event.target.value)}
              required
              value={values.role}
            />
          </label>
          <label>
            Source
            <input
              onChange={(event) => updateValue("source", event.target.value)}
              placeholder="LinkedIn, referral, careers page"
              value={values.source}
            />
          </label>
          <label>
            Deadline
            <input
              onChange={(event) => updateValue("deadline", event.target.value)}
              type="date"
              value={values.deadline}
            />
          </label>
          <label>
            Status
            <select
              onChange={(event) =>
                updateValue("status", toApplicationStatus(event.target.value))
              }
              value={values.status}
            >
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Next action
            <input
              onChange={(event) => updateValue("nextAction", event.target.value)}
              placeholder="Follow up, prep round, apply"
              value={values.nextAction}
            />
          </label>
        </div>
        <label className="wide-field">
          Notes
          <textarea
            onChange={(event) => updateValue("notes", event.target.value)}
            placeholder="Recruiter names, interview details, links, reminders"
            rows={3}
            value={values.notes}
          />
        </label>
        <label className="wide-field">
          Skill context submitted
          <textarea
            onChange={(event) => updateValue("skillContext", event.target.value)}
            placeholder="Resume version, skills emphasized, cover-letter angle, project examples"
            rows={3}
            value={values.skillContext}
          />
        </label>
        <div className="form-actions">
          <button className="secondary-action" onClick={handleClear} type="button">
            Cancel
          </button>
          <button className="primary-action" type="submit">
            Update application
          </button>
        </div>
      </form>
    </section>
  );
};
