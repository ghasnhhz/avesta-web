import type {ReactNode} from 'react';

/**
 * Every text input, select and date field in the app. Hoisted here because the
 * search form and the passenger form must not drift apart: a 44px target and a
 * visible focus ring are accessibility floors, not per-screen choices.
 */
export const fieldStyle =
  'min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground transition-colors duration-200 hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/** Red border while the field is wrong, on top of whatever else it carries. */
export const fieldErrorStyle = 'border-danger hover:border-danger';

type Props = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: (props: {id: string; describedBy?: string; invalid: boolean}) => ReactNode;
};

/**
 * Label, hint and error wired to the control by id. The control is a render
 * prop rather than a set of props because an input, a select and a radio group
 * take different attributes, and faking one interface over all three would hide
 * the differences that matter to a screen reader.
 */
export function Field({id, label, hint, error, children}: Props) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-muted">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="mb-1.5 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {children({id, describedBy, invalid: Boolean(error)})}
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
