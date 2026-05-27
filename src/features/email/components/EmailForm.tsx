import type { FormEvent } from "react";
import { useState } from "react";
import type { EmailInput } from "../../../types/email";
import { getEmptyEmailInput } from "../../../utils/emailForms";

type EmailFormProps = {
  readonly onSubmit: (input: EmailInput) => void;
};

export const EmailForm = ({ onSubmit }: EmailFormProps) => {
  const [input, setInput] = useState<EmailInput>(getEmptyEmailInput);

  const updateInput = <Key extends keyof EmailInput>(
    key: Key,
    value: EmailInput[Key],
  ): void => {
    setInput((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit(input);
    setInput(getEmptyEmailInput());
  };

  return (
    <form className="email-panel" onSubmit={handleSubmit}>
      <label>
        Email subject
        <input
          onChange={(event) => updateInput("subject", event.target.value)}
          placeholder="Update regarding your application"
          value={input.subject}
        />
      </label>
      <label>
        Email body
        <textarea
          onChange={(event) => updateInput("body", event.target.value)}
          placeholder="Paste the full email here"
          rows={12}
          value={input.body}
        />
      </label>
      <button className="primary-action" type="submit">
        Analyze email
      </button>
    </form>
  );
};
