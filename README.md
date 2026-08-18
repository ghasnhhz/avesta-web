# Avesta

We help tourists get around Uzbekistan. Right now that means bus and train
tickets.

Foreign cards and foreign phone numbers don't reliably work on the official
sites, so tourists can't book. Tell us the journey, we buy the ticket locally and
send you the PDF. Our fee is 10%, shown as its own line.

This repo is the website. The Telegram bot is separate and already live.

## How it works

```
search → choose → passenger details → pay → we buy it → ticket by email
```

Trains and buses appear in one list, sorted by departure time. Prices and
availability come live from the railway and the bus operators.

## Rules

- Read availability only. A human buys every ticket.
- Never bypass a captcha, login, or rate limit.
- Sold out means sold out — never show a price we can't honour.
- Never collect card numbers.
- Never hide the fee.

## Status

Pre-launch. Payment is bank transfer until the company registers in September.
