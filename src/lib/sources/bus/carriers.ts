// The aggregator federates 8 carrier backends. Search is answered by the
// aggregator, but the seat map for a trip lives on the host of the carrier that
// owns it, identified by `api_id` on the trip record.
//
// The carriers sit on avtotickets.uz — plural — while the aggregator is on
// avtoticket.uz. The near-identical domains are not a typo here.
const CARRIERS: Record<number, {name: string; host: string}> = {
  0: {name: 'UZAVTOVOKZAL', host: 'https://wapi.avtoticket.uz'},
  1: {name: 'ALLCOMFORT', host: 'https://wapi.congresshall.avtotickets.uz'},
  2: {name: 'XATIRCHI', host: 'https://wapi.xatirchi.avtotickets.uz'},
  3: {name: 'UZAUTOTRANS', host: 'https://wapi.uzautotrans.avtotickets.uz'},
  4: {name: 'COMFORTAUTO', host: 'https://wapi.comfortauto.avtotickets.uz'},
  5: {name: 'EXPRESSTOUR', host: 'https://wapi.expresstour.avtotickets.uz'},
  6: {name: 'NUKUS', host: 'https://wapi.nukus.avtotickets.uz'},
  7: {name: 'HUNARMAND', host: 'https://wapi.hunarmand.avtotickets.uz'}
};

export type Carrier = {apiId: number; name: string; host: string};

export const CARRIER_IDS = Object.keys(CARRIERS).map(Number);

/** Null for an api_id we have never seen, so a new carrier surfaces loudly. */
export function carrier(apiId: unknown): Carrier | null {
  if (typeof apiId !== 'number' || !(apiId in CARRIERS)) return null;
  return {apiId, ...CARRIERS[apiId]};
}
