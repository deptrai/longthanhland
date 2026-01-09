import { firstDayOfWeekSchema } from './firstDayOfWeekSchema';
import { relativeDateFilterAmountSchema } from './relativeDateFilterAmountSchema';
import { relativeDateFilterDirectionSchema } from './relativeDateFilterDirectionSchema';
import { relativeDateFilterUnitSchema } from './relativeDateFilterUnitSchema';

import z from 'zod';

export const relativeDateFilterSchema = z
  .object({
    direction: relativeDateFilterDirectionSchema,
    amount: relativeDateFilterAmountSchema.nullish(),
    unit: relativeDateFilterUnitSchema,
    timezone: z.string().nullish(),
    firstDayOfTheWeek: firstDayOfWeekSchema.nullish(),
  })
  .refine((data) => !(data.amount === undefined && data.direction !== 'THIS'), {
    error: "Amount cannot be 'undefined' unless direction is 'THIS'",
  });

export type RelativeDateFilter = z.infer<typeof relativeDateFilterSchema>;
