import { AxiosError, type AxiosResponse } from 'axios';
import { getRollenerweiterungErrors } from './errorHandlers';

function createAxiosError(data: unknown): AxiosError {
  const error: AxiosError = new AxiosError();
  error.response = { data } as AxiosResponse;
  return error;
}

describe('getRollenerweiterungErrors', (): void => {
  it('maps valid ids and i18n keys', (): void => {
    const error: AxiosError = createAxiosError({
      code: 500,
      idsWithI18nKeys: [{ id: 'service-provider-1', i18nKey: 'ROLLENERWEITERUNG_TECHNICAL_ERROR' }],
    });

    const errors: Map<string, string> | null = getRollenerweiterungErrors<string>(error);

    expect(errors).toEqual(new Map([['service-provider-1', 'ROLLENERWEITERUNG_TECHNICAL_ERROR']]));
  });

  it('ignores entries without a valid id or i18n key', (): void => {
    const error: AxiosError = createAxiosError({
      code: 500,
      idsWithI18nKeys: [
        { id: 'service-provider-1', i18nKey: 'NOT_FOUND' },
        { id: 'service-provider-2' },
        { i18nKey: 'NOT_FOUND' },
      ],
    });

    const errors: Map<string, string> | null = getRollenerweiterungErrors<string>(error);

    expect(errors).toEqual(new Map([['service-provider-1', 'NOT_FOUND']]));
  });

  it('returns null for a response without a numeric code', (): void => {
    const error: AxiosError = createAxiosError({ idsWithI18nKeys: [] });

    expect(getRollenerweiterungErrors<string>(error)).toBeNull();
  });

  it('returns null for a non-Axios error', (): void => {
    expect(getRollenerweiterungErrors<string>(new Error('request failed'))).toBeNull();
  });
});
