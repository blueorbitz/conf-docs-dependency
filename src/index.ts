import Resolver from '@forge/resolver';
import * as ResolveFunc from './resolver';

const resolver = new Resolver();

Object.keys(ResolveFunc).map(funcName => {
  resolver.define(funcName, ResolveFunc[funcName] as any);
});

export const handler = resolver.getDefinitions();

export const invoker = async (req) => {
  const { name, payload } = req.queryParameters;
  if (name == null || payload == null)
    return { statusCode: 400 };

  console.log('invoker:', name);
  const _name = name[0];
  const _payload = payload[0];

  const ModuleList = ['setup-space', 'visual-space', 'quick-glance'];
  const MOCK_MODULE = ModuleList[2];
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