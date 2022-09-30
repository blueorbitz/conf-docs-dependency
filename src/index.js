import Resolver from '@forge/resolver';

const resolver = new Resolver();

resolver.define('getText', (req) => {
  console.log(req);
  return 'Hello, world!';
});

resolver.define('getContext', async (req) => {
  return { ...req.context };
});

export const handler = resolver.getDefinitions();
