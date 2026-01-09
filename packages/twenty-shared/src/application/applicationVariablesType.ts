import { type SyncableEntityOptions } from './syncableEntityOptionsType';

type ApplicationVariable = SyncableEntityOptions & {
  value?: string;
  description?: string;
  isSecret?: boolean;
};

export type ApplicationVariables = Record<string, ApplicationVariable>;
