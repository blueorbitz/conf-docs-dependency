import Resolver from '@forge/resolver';
import * as ResolveFunc from './resolver';
import * as TriggerFunc from './trigger';

const resolver = new Resolver();

Object.keys(ResolveFunc).map(funcName => {
  resolver.define(funcName, ResolveFunc[funcName] as any);
});

export const handler = resolver.getDefinitions();

export const invoker = async (req) => {
  const { name, payload } = JSON.parse(req.body); // req.queryParameters;
  if (name == null || payload == null)
    return { statusCode: 400 };

  console.log('invoker:', name);
  const _name = name;
  const _payload = payload;

  const ModuleList = ['setup-space', 'visual-space', 'quick-glance'];
  const MOCK_MODULE = ModuleList[0];
  const result = await ResolveFunc[_name]({
    payload: _payload,
    context: {
      cloudId: '{{uuid}}',        
      environmentId: '{{uuid}}',  
      environmentType: 'DEVELOPMENT',
      moduleKey: MOCK_MODULE,
      siteUrl: 'https://subdomain.atlassian.net',
      extension: { type: 'confluence:spacePage' },
      accountId: '70121:{{uuid}}'
    }
  });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': ['application/json'],
    },
    body: JSON.stringify(result),
  };
}

export const onchange = TriggerFunc.onchange;