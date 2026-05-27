export type Note = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly tags: readonly string[];
  readonly linkedApplicationId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type NoteFormValues = {
  readonly title: string;
  readonly body: string;
  readonly tags: string;
  readonly linkedApplicationId: string;
};
