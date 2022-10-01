import Resolver from '@forge/resolver';
import * as ResolveFunc from './resolver';

const resolver = new Resolver();

Object.keys(ResolveFunc).map(funcName => {
  resolver.define(funcName, ResolveFunc[funcName] as any);
});

export const handler = resolver.getDefinitions();
