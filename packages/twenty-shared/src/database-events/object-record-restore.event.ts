import { ObjectRecordCreateEvent } from './object-record-create.event';

export class ObjectRecordRestoreEvent<
  T = object,
> extends ObjectRecordCreateEvent<T> {
  declare properties: {
    after: T;
  };
}
