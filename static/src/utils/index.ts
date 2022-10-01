const FORGE_FRONTEND_DEV = 'true'; // purely for frontend development to leverage on hotreloading
const FORGE_MODULE_KEY = 'hello-world-space'; // to simulate the page you're currently developing

const invoke = async (name: string, payload?: object) => {
  if (FORGE_FRONTEND_DEV !== 'true') {
    const ForgeBridge = require('@forge/bridge');
    return ForgeBridge.invoke(name, payload);
  }
  else {
    const context = {
      cloudId: '{{uuid}}',        
      localId: 'ari-cloud-ecosystem--extension-{{uuid}}-static-hello-world-space',
      environmentId: '{{uuid}}',  
      environmentType: 'DEVELOPMENT',
      moduleKey: FORGE_MODULE_KEY,
      siteUrl: 'https://subdomain.atlassian.net',
      extension: { type: 'confluence:spacePage' },
      installContext: 'ari:cloud:confluence::site/{{uuid}}',
      accountId: '70121:{{uuid}}',
      license: undefined,
      jobId: undefined,
    };

    switch (name) {
      case 'getText': return 'Hello World';
      case 'getContext': return context;
    }
  }
};

export { invoke };