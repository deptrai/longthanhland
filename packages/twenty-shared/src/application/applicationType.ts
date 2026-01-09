import { type ApplicationVariables } from './';
import { type SyncableEntityOptions } from './syncableEntityOptionsType';

export type Application = SyncableEntityOptions & {
  displayName?: string;
  description?: string;
  icon?: string;
  applicationVariables?: ApplicationVariables;
  functionRoleUniversalIdentifier?: string;
};
