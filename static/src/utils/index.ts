const {
  REACT_APP_FRONTEND_DEV_ONLY,
  REACT_APP_MOCK_TRIGGER_URL,
} = process.env;

const invoke = async (name: string, payload?: object) => {
  if (REACT_APP_FRONTEND_DEV_ONLY !== 'true') {
    const ForgeBridge = require('@forge/bridge');
    return ForgeBridge.invoke(name, payload);
  }
  else {
    const params = '?' + new URLSearchParams({
      name: name,
      payload: JSON.stringify(payload || ''),
    });

    const response = await fetch(REACT_APP_MOCK_TRIGGER_URL + params);
    return await response.json();
  }
};

export { invoke };