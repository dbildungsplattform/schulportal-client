import { isAxiosError } from 'axios';

// Type the error response data structure otherwise eslint complains
type ApiErrorData = {
  i18nKey?: string;
  code?: string;
  message?: string;
};

export function getResponseErrorCode(error: unknown, defaultErrorCode: string): string {
  if (isAxiosError<ApiErrorData>(error)) {
    const data: ApiErrorData | undefined = error.response?.data;
    const errorCode: string | undefined = data?.i18nKey ?? data?.code;
    return errorCode ?? defaultErrorCode;
  }

  return 'UNSPECIFIED_ERROR';
}

/* some endpoints respond with an error message, so we have to cover that case as well */
export function getResponseErrorMessage(error: unknown): string {
  let errorCode: string = 'UNSPECIFIED_ERROR';

  if (isAxiosError<ApiErrorData>(error)) {
    const msg: string = error.response?.data?.message ?? 'UNSPECIFIED_ERROR';
    errorCode = msg;
  }

  return errorCode;
}

type RollenerweiterungErrorData = {
  code?: unknown;
  idsWithI18nKeys?: Array<{
    id?: unknown;
    i18nKey?: unknown;
  }>;
};

export function getRollenerweiterungErrors<T extends string>(error: unknown): Map<string, T> | null {
  if (!isAxiosError<RollenerweiterungErrorData>(error)) {
    return null;
  }

  const responseData: RollenerweiterungErrorData | undefined = error.response?.data;
  if (!responseData || typeof responseData.code !== 'number' || !Array.isArray(responseData.idsWithI18nKeys)) {
    return null;
  }

  const errors: Map<string, T> = new Map();
  responseData.idsWithI18nKeys.forEach((item: { id?: unknown; i18nKey?: unknown }): void => {
    if (typeof item.id === 'string' && typeof item.i18nKey === 'string') {
      errors.set(item.id, item.i18nKey as T);
    }
  });

  return errors;
}
