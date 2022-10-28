const {
  REACT_APP_FRONTEND_DEV_ONLY,
  REACT_APP_MOCK_TRIGGER_URL,
} = process.env;

const noop = () => {};
export const log = REACT_APP_FRONTEND_DEV_ONLY === 'true' ? console.log: noop;

export const delay = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const invoke = async (name: string, payload?: any) => {
  const _payload = typeof payload === 'object'
    ? JSON.stringify(payload)
    : payload ?? '';

  if (REACT_APP_FRONTEND_DEV_ONLY !== 'true') {
    const ForgeBridge = require('@forge/bridge');
    return ForgeBridge.invoke(name, _payload);
  }
  else {
    console.log('fetch', REACT_APP_MOCK_TRIGGER_URL, {
      name: name,
      payload: _payload,
    });

    const response = await fetch(REACT_APP_MOCK_TRIGGER_URL, {
      method: 'post',
      body: JSON.stringify({ name, payload: _payload }),
    });
    const json = await response.json();
    console.log(json);
    if (response.status !== 200)
      throw new Error(json.error);

    return json;
  }
};

export function debounce(fn, delay = 250) {
  let timeout;

  return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
          fn(...args);
      }, delay);
  };
};
