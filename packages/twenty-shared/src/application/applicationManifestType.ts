import {
  type ObjectManifest,
  type ServerlessFunctionManifest,
  type Application,
} from './';
import { type Sources } from '../types';
import { type RoleManifest } from './roleManifestType';

export type ApplicationManifest = {
  application: Application;
  objects: ObjectManifest[];
  serverlessFunctions: ServerlessFunctionManifest[];
  roles?: RoleManifest[];
  sources: Sources;
};
