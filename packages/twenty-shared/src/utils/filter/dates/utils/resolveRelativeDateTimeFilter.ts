import { addUnitToZonedDateTime } from './addUnitToZonedDateTime';
import { getNextPeriodStart } from './getNextPeriodStart';
import { getPeriodStart } from './getPeriodStart';
import { type RelativeDateFilter } from './relativeDateFilterSchema';
import { subUnitFromZonedDateTime } from './subUnitFromZonedDateTime';
import { isDefined } from '../../../validation';
import { type Temporal } from 'temporal-polyfill';

export const resolveRelativeDateTimeFilter = (
  relativeDateFilter: RelativeDateFilter,
  referenceZonedDateTime: Temporal.ZonedDateTime,
) => {
  const { direction, amount, unit, firstDayOfTheWeek } = relativeDateFilter;

  const isSubDayUnit = ['SECOND', 'MINUTE', 'HOUR'].includes(unit);

  switch (direction) {
    case 'NEXT': {
      if (!isDefined(amount)) {
        throw new Error('Amount is required');
      }

      if (isSubDayUnit) {
        return {
          ...relativeDateFilter,
          start: referenceZonedDateTime,
          end: addUnitToZonedDateTime(referenceZonedDateTime, unit, amount),
        };
      } else {
        const startOfNextDay = referenceZonedDateTime
          .startOfDay()
          .add({ days: 1 });

        return {
          ...relativeDateFilter,
          start: startOfNextDay,
          end: addUnitToZonedDateTime(startOfNextDay, unit, amount),
        };
      }
    }
    case 'PAST': {
      if (!isDefined(amount)) {
        throw new Error('Amount is required');
      }

      if (isSubDayUnit) {
        return {
          ...relativeDateFilter,
          start: subUnitFromZonedDateTime(referenceZonedDateTime, unit, amount),
          end: referenceZonedDateTime,
        };
      } else {
        const startOfDay = referenceZonedDateTime.startOfDay();

        return {
          ...relativeDateFilter,
          start: subUnitFromZonedDateTime(startOfDay, unit, amount),
          end: startOfDay,
        };
      }
    }
    case 'THIS':
      return {
        ...relativeDateFilter,
        start: getPeriodStart(referenceZonedDateTime, unit, firstDayOfTheWeek),
        end: getNextPeriodStart(
          referenceZonedDateTime,
          unit,
          firstDayOfTheWeek,
        ),
      };
  }
};
