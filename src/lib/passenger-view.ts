import type {BerthPreference, Choice} from '@/lib/choice-params';
import type {BookingView, ClassOption} from '@/lib/booking-view';
import type {Train} from '@/lib/sources/rail';

type OnTrain = {train: Train; arrivalDayOffset: number};

/**
 * What is left of the tourist's choice by the time they reach the passenger
 * form. The class they picked may have moved price or stopped being listed in
 * the minutes since, and those are two different sentences to say.
 */
export type PassengerView =
  | ({
      state: 'ready';
      option: ClassOption;
      /** Null on a seated class, which has no berths to prefer between. */
      berth: BerthPreference | null;
    } & OnTrain)
  | ({state: 'price_changed'; option: ClassOption; chosenSum: number} & OnTrain)
  | ({state: 'class_gone'; code: string} & OnTrain)
  | Exclude<BookingView, {state: 'ready'}>;

/**
 * Takes the built booking rather than the raw search, so the upstream state
 * machine lives in one place and every answer it already gives — sold out, a
 * fare we refused, the railway not answering — passes straight through here.
 *
 * A class id is `code:priceSum`, so a fare that moved simply fails to match. If
 * the code is still listed at exactly one other price we can name that number
 * and offer to go on at it. At two or more there is nothing honest to name — we
 * would be picking a price for somebody — so it degrades to class_gone.
 */
export function buildPassengerChoice(view: BookingView, choice: Choice): PassengerView {
  if (view.state !== 'ready') return view;

  const {classes, train, arrivalDayOffset} = view;
  const on: OnTrain = {train, arrivalDayOffset};

  const chosen = classes.find((option) => option.id === choice.classId);
  if (chosen) {
    return {
      state: 'ready',
      option: chosen,
      berth: chosen.berths ? choice.berth : null,
      ...on
    };
  }

  const code = classCode(choice.classId);
  const sameCode = classes.filter((option) => option.code === code);

  if (sameCode.length === 1) {
    return {
      state: 'price_changed',
      option: sameCode[0],
      chosenSum: chosenSum(choice.classId),
      ...on
    };
  }

  return {state: 'class_gone', code, ...on};
}

// Split from the right: the price is digits and the code is the railway's own
// string, which we do not assume anything about.
function classCode(classId: string): string {
  const mark = classId.lastIndexOf(':');
  return mark === -1 ? classId : classId.slice(0, mark);
}

function chosenSum(classId: string): number {
  return Number(classId.slice(classId.lastIndexOf(':') + 1));
}
