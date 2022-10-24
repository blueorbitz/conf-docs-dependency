import Resolver from '@forge/resolver';
import * as ResolveFunc from './resolver';
import type { ResolverFunction } from './resolver';
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

  const MOCK_INDEX = 0;
  const ModuleList = ['setup-space', 'visual-space', 'quick-glance'];
  const ModuleExtension = [
    {
      type: 'confluence:spacePage'
    },
    {
      type: 'confluence:spacePage'
    },
    {
      type: 'confluence:confluence:contentBylineItem',
      content: {
        id: '557075',
        type: 'page',
      },
      space: { key: 'STRAWHAT' },
    },
  ];
  const MOCK_MODULE = ModuleList[MOCK_INDEX];
  const MOCK_EXTENSION = ModuleExtension[MOCK_INDEX];
  const resolverArg: ResolverFunction = {
    payload: _payload,
    context: {
      cloudId: '{{uuid}}',        
      environmentId: '{{uuid}}',  
      environmentType: 'DEVELOPMENT',
      moduleKey: MOCK_MODULE,
      siteUrl: 'https://subdomain.atlassian.net',
      extension: MOCK_EXTENSION,
      accountId: '70121:{{uuid}}'
    },
  };

  const result = await ResolveFunc[_name](resolverArg);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': ['application/json'],
    },
    body: JSON.stringify(result),
  };
}

export const neo4jTrigger = async (req) => {
  console.log("Calling neo4j api...");
  const { VERCEL_NEO4J_SERVERLESS_URL } = process.env;
  await fetch(VERCEL_NEO4J_SERVERLESS_URL + `/api`, {
    method: 'post',
    body: 'MATCH p = (page:PAGE)-[:LINKS]->(linkTo) WHERE page.instance="::instance::" RETURN p;',
    headers: { 'Content-Type': 'text/plain' }
  });
  console.log("neo4j api called.");
}

export const onchange = TriggerFunc.onchange;