const {
  REACT_APP_FRONTEND_DEV_ONLY,
  REACT_APP_MOCK_TRIGGER_URL,
} = process.env;

const invoke = async (name: string, payload?: any) => {
  const _payload = typeof payload === 'object'
    ? JSON.stringify(payload)
    : payload ?? '';

  if (REACT_APP_FRONTEND_DEV_ONLY !== 'true') {
    const ForgeBridge = require('@forge/bridge');
    return ForgeBridge.invoke(name, _payload);
  }
  else {
    const params = '?' + new URLSearchParams({
      name: name,
      payload: _payload,
    });

    console.log('fetch', REACT_APP_MOCK_TRIGGER_URL + params);
    const response = await fetch(REACT_APP_MOCK_TRIGGER_URL + params);
    const json = await response.json();
    console.log(json);
    if (response.status !== 200)
      throw new Error(json.error);

    return json;
  }
};

export { invoke };