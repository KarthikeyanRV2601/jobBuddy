import type { Note, NoteFormValues } from "../types/note";
import { createId } from "./id";
import { cleanText } from "./text";

export const getEmptyNoteFormValues = (): NoteFormValues => ({
  title: "",
  body: "",
  tags: "",
  linkedApplicationId: "",
});

export const createNote = (
  values: NoteFormValues,
  nowIso: string,
): Note => ({
  id: createId(),
  title: cleanText(values.title) || "Untitled note",
  body: cleanText(values.body),
  tags: parseTags(values.tags),
  linkedApplicationId: values.linkedApplicationId,
  createdAt: nowIso,
  updatedAt: nowIso,
});

export const addNote = (
  notes: readonly Note[],
  note: Note,
): readonly Note[] => [note, ...notes];

export const deleteNote = (
  notes: readonly Note[],
  id: string,
): readonly Note[] => notes.filter((note) => note.id !== id);

export const getLinkedApplicationLabel = (
  linkedApplicationId: string,
  applications: readonly { readonly id: string; readonly company: string; readonly role: string }[],
): string => {
  const application = applications.find((item) => item.id === linkedApplicationId);
  if (application === undefined) {
    return "General";
  }

  return `${application.company} · ${application.role}`;
};

const parseTags = (value: string): readonly string[] =>
  value
    .split(",")
    .map(cleanText)
    .filter((tag) => tag.length > 0);
