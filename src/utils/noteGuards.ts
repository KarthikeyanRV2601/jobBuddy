import type { Note } from "../types/note";

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

export const isNote = (value: unknown): value is Note => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.body === "string" &&
    isStringArray(candidate.tags) &&
    typeof candidate.linkedApplicationId === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  );
};

export const isNoteList = (value: unknown): value is readonly Note[] =>
  Array.isArray(value) && value.every(isNote);
