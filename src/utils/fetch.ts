const { NODE_ENV } = process.env;

const restFetch = async (url: string, options: any = {}) => {
  const fetch = require('node-fetch');
  return await fetch(url, options);
};

const forgeFetch = async (url: string, options: any = {}) => {
  const { fetch } = require('@forge/api');
  return await fetch(url, options);
};

export default async (url: string, options: any = {}) => {
  if (NODE_ENV !== 'test')
    return await forgeFetch(url, options);
  else
    return await restFetch(url, options);
};