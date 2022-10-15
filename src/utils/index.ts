import fetch from './fetch';
import requestConfluence from './requestConfluence';

const noop = () => {};
const log = process.env.NODE_ENV !== 'test' ? console.log: noop;

export {
  fetch,
  requestConfluence,
  log,
};