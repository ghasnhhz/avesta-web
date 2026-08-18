import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {RailUpstreamError, fetchTrainList} from './client';

const TOKEN = '9654ec11-0000-4000-8000-000000000000';

function csrfResponse() {
  const headers = new Headers();
  headers.append('set-cookie', `XSRF-TOKEN=${TOKEN}; Path=/; HttpOnly`);
  return new Response('', {status: 200, headers});
}

beforeEach(() => {
  process.env.RAIL_USER_AGENT = 'AvestaBot/0.1 (+https://avesta.uz/contact)';
});

afterEach(() => vi.unstubAllGlobals());

describe('rail client', () => {
  it('sends the headers the search requires, with matching token in both places', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(csrfResponse())
      .mockResolvedValueOnce(Response.json({data: {directions: {}}}));
    vi.stubGlobal('fetch', fetchMock);

    await fetchTrainList('2026-08-26', '2900790', '2900000');

    const [url, init] = fetchMock.mock.calls[1];
    const headers = init.headers as Record<string, string>;

    expect(url).toContain('/api/v3/handbook/trains/list');
    expect(headers['Accept-Language']).toBe('en');
    expect(headers.Cookie).toBe(`XSRF-TOKEN=${TOKEN}`);
    expect(headers['X-XSRF-TOKEN']).toBe(TOKEN);
    expect(JSON.parse(init.body as string)).toEqual({
      directions: {forward: {date: '2026-08-26', depStationCode: '2900790', arvStationCode: '2900000'}}
    });
  });

  it('identifies itself truthfully and never as a browser', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(csrfResponse())
      .mockResolvedValueOnce(Response.json({}));
    vi.stubGlobal('fetch', fetchMock);

    await fetchTrainList('2026-08-26', '2900790', '2900000');

    for (const [, init] of fetchMock.mock.calls) {
      const ua = (init.headers as Record<string, string>)['User-Agent'];
      expect(ua).toContain('AvestaBot');
      expect(ua).not.toMatch(/Mozilla|Chrome|Safari/);
    }
  });

  it('reports a block rather than retrying it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', {status: 403}));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchTrainList('2026-08-26', '2900790', '2900000')).rejects.toThrow(
      RailUpstreamError
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('fails when no token cookie comes back, rather than searching without one', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', {status: 200})));

    await expect(fetchTrainList('2026-08-26', '2900790', '2900000')).rejects.toThrow(
      /XSRF-TOKEN/
    );
  });
});
