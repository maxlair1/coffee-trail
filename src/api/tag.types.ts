export type Tag = {
  id: number;
  name: string;
  color: string;
  icon: string | null;
};

export type TagInsert = Omit<Tag, "id"> & {
  id?: number;
};

export type TagUpdate = Partial<TagInsert> & { id: number };