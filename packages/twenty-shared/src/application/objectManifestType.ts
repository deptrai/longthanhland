import { type FieldManifest } from './';
import { type SyncableEntityOptions } from './syncableEntityOptionsType';

export type ObjectManifest = SyncableEntityOptions & {
  nameSingular: string;
  namePlural: string;
  labelSingular: string;
  labelPlural: string;
  description?: string;
  icon?: string;
  fields?: FieldManifest[];
};
