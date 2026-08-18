Raw responses, captured 2026-08-18. Do not hand-edit — capture instead.

`wapi.avtoticket.uz` refuses server-to-server calls with
`403 {"message":"Access denied: requests are only allowed from avtoticket.uz<ip>"}`,
so these came out of a browser sitting on avtoticket.uz, fetched from the page's
own origin. Originals and the method are in `harness/captures/bus/`.

- `urgench-tashkent-2026-08-19.json` — five bookable trips, plus the shoulder-day
  blocks that carry a `count` with an empty `trips` array.
- `tashkent-urgench-2026-08-19.json` — the reverse leg, where four of five trips
  return `arrive_at` equal to `departure_at` with `diff: 0`.
- `seatmap-comfortauto-61720.json` — 51 seats with the men/women split, from the
  carrier host rather than the aggregator.
