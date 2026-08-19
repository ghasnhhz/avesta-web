'use client';

import {type Ref} from 'react';
import {useTranslations} from 'next-intl';
import {FIELD_LABEL, fieldId} from '@/components/passengers/passenger-fields';
import type {PartyErrors, PassengerDraft} from '@/lib/passengers';

type Props = {
  errors: PartyErrors;
  /** The id of the contact email input, which lives outside the passenger cards. */
  emailId: string;
  ref?: Ref<HTMLDivElement>;
};

/**
 * Shown only after a failed continue, and every wrong field at once. A long
 * form on a phone puts most of its errors off screen, so the list has to come
 * to the tourist rather than the other way round.
 */
export function ErrorSummary({errors, emailId, ref}: Props) {
  const t = useTranslations('passengers');
  const items = listErrors(errors, emailId, t);

  if (items.length === 0) return null;

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="rounded-lg border border-danger bg-surface p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger sm:p-6"
    >
      <h2 className="font-serif text-xl tracking-tight text-danger">{t('errorSummary')}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className="text-danger underline underline-offset-4 transition-opacity duration-200 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-danger"
            >
              {item.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Item = {href: string; message: string};

function listErrors(
  errors: PartyErrors,
  emailId: string,
  t: ReturnType<typeof useTranslations<'passengers'>>
): Item[] {
  const items: Item[] = [];

  errors.passengers.forEach((passenger, index) => {
    for (const field of Object.keys(FIELD_LABEL) as (keyof PassengerDraft)[]) {
      const error = passenger[field];
      if (!error) continue;

      items.push({
        href: `#${fieldId(index, field)}`,
        // Numbered, because four passengers produce four identical sentences
        // otherwise and none of them says which card to scroll to.
        message: t('errorAt', {
          number: index + 1,
          message: t(`errors.${error}`, {field: t(FIELD_LABEL[field])})
        })
      });
    }
  });

  if (errors.email) {
    items.push({
      href: `#${emailId}`,
      message: t(`errors.${errors.email}`, {field: t('contact.email')})
    });
  }

  return items;
}
