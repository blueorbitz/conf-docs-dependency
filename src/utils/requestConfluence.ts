import { isForge } from ".";
import type { RequestInit} from 'node-fetch';
const { FORGE_EMAIL, FORGE_API_TOKEN, ATL_INSTANCE_URL } = process.env;

const restRequestConfluence = async (path: string, options: RequestInit = {}) => {
  const fetch = require('node-fetch');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + Buffer.from(FORGE_EMAIL + ":" + FORGE_API_TOKEN).toString('base64'),
  };
  return await fetch(ATL_INSTANCE_URL + path, {
    headers, ...options,
  });
};

const forgeRequestConfluence = async (path: string, options: RequestInit = {}) => {
  const api = require('@forge/api');
  const { route } = api;

  return await api.asApp().requestConfluence(route(path), {
    headers: { 'Accept': 'application/json' }, ...options,
  });
};

export default async (path: string, options: any = {}) => {
  if (isForge())
    return await forgeRequestConfluence(path, options);
  else
    return await restRequestConfluence(path, options);
};
