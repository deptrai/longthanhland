import { type EachTestingContext } from './EachTestingContext.type';

export type SuccessfulAndFailingTestCases<T> = {
  successful: EachTestingContext<T>[];
  failing: EachTestingContext<T>[];
};
