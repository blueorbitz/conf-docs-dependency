import fetch from './fetch';
import requestConfluence from './requestConfluence';
import * as cypher from './cypher';

const noop = () => {};
const log = process.env.NODE_ENV !== 'test' ? console.log: noop;

// @ts-ignore: platform targeted for Atlassian. Thus, NodeJS not able to recognise
const isForge = () => process.platform === 'forge';

export {
  log,
  isForge,
  cypher,
  fetch,
  requestConfluence,
};