import { isForge } from ".";
import type { RequestInfo, RequestInit} from 'node-fetch';

const restFetch = async (url: RequestInfo, options: RequestInit = {}) => {
  const fetch = require('node-fetch');
  return await fetch(url, options);
};

const forgeFetch = async (url: RequestInfo, options: RequestInit = {}) => {
  const { fetch } = require('@forge/api');
  return await fetch(url, options);
};

export default async (url: RequestInfo, options: RequestInit = {}) => {
  if (isForge())
    return await forgeFetch(url, options);
  else
    return await restFetch(url, options);
};