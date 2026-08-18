import type {ReactNode} from 'react';

type Props = {
  /** `warning` is for something upstream going wrong, never for an empty result. */
  tone?: 'neutral' | 'warning';
  heading: string;
  children?: ReactNode;
};

export function Notice({tone = 'neutral', heading, children}: Props) {
  const border = tone === 'warning' ? 'border-l-4 border-l-accent' : '';

  return (
    <div className={`rounded-lg border border-border bg-surface p-5 sm:p-6 ${border}`}>
      <h2 className="font-serif text-xl tracking-tight">{heading}</h2>
      {children ? <div className="mt-2 max-w-prose text-muted">{children}</div> : null}
    </div>
  );
}
