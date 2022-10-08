import api, { route, fetch } from '@forge/api';

const getNeo4jPrefix = (siteUrl: string) => siteUrl.match(/https:\/\/(\S+).atlassian.net/)[1].replace('-', '_');

export const getText = async (req: any) => {
  console.log(req);
  return 'Hello, world!';
};

export const getContext = async (req: any) => {
  return { ...req.context };
};

export const getSpaces = async (req: any) => {
  console.log(route`/wiki/rest/api/space?expand=metadata.properties&limit=99`);
  const response = await api.asApp().requestConfluence(route`/wiki/rest/api/space?expand=metadata.properties&limit=99`, {
    headers: { 'Accept': 'application/json' },
  });

  console.log(`getSpaces: ${response.status} ${response.statusText}`);
  return await response.json();
};

export const getContents = async (req: any) => {
  const spaceKey = req.payload;
  const response = await api.asApp().requestConfluence(route`/wiki/rest/api/space/${spaceKey}/content?expand=metadata.properties&limit=99`, {
    headers: { 'Accept': 'application/json' },
  });

  console.log(`getContents: ${response.status} ${response.statusText}`);
  return await response.json();
}

export const getContent = async (req: any) => {
  const pageId = req.payload;
  const response = await api.asApp().requestConfluence(route`/wiki/rest/api/content/${pageId}?expand=body.storage,space`, {
    headers: { 'Accept': 'application/json' },
  });

  console.log(`getContents: ${response.status} ${response.statusText}`);
  return await response.json();
};

export const getPageId = async (req: any) => {
  const { spaceKey, title } = JSON.parse(req.payload);
  console.log('getPageId', spaceKey, title);
  const response = await api.asApp().requestConfluence(route`/wiki/rest/api/content/search?cql=type=page AND space="${spaceKey}" AND title="${title}"&limit=1`, {
    headers: { 'Accept': 'application/json' },
  });

  console.log(`getPageId: ${response.status} ${response.statusText}`);
  return await response.json();
};

export const contentProperty = async (req: any) => {
  const { method, id, PropertyKey, body } = JSON.parse(req.payload);
  
  const response = await api.asApp().requestConfluence(route`/wiki/rest/api/content/${id}/property/${PropertyKey}`, {
    method, body, headers: { 'Accept': 'application/json' },
  });
  
  console.log(`contentProperty[${method}]: ${response.status} ${response.statusText}`);
  if (response.status !== 200)
    return { status: response.status, statusText: response.statusText };
  
  return await response.json();
}

export const spaceProperty = async (req: any) => { 
  const { method, spaceKey, PropertyKey, body } = JSON.parse(req.payload);
  
  const response = await api.asApp().requestConfluence(route`/wiki/rest/api/space/${spaceKey}/property/${PropertyKey}`, {
    method, body, headers: { 'Accept': 'application/json' },
  });
  
  console.log(`spaceProperty[${method}]: ${response.status} ${response.statusText}`);
  if (response.status !== 200)
    return { status: response.status, statusText: response.statusText };
  
  return await response.json();
}

export const postMergeGraph = async (req: any) => {
  const VERCEL_NEO4J_SERVERLESS_URL = 'https://serverless-neo4j-api.vercel.app';
  try {
    const { siteUrl } = req.context;
    const prefix = getNeo4jPrefix(siteUrl);

    let query = JSON.parse(req.payload).map(txt => `MERGE ${txt}`).join('\n');
    query = query.replace(/::prefix::/g, prefix);

    console.log('postMergeGraph', query);

    const response = await fetch(VERCEL_NEO4J_SERVERLESS_URL + `/api`, {
      method: 'post',
      body: query,
      headers: {'Content-Type': 'text/plain'}
    });

    console.log(`postMergeGraph: ${response.status} ${response.statusText}`);
    if (response.status !== 200)
      throw new Error(await response.json());

    return await response.json();
  } catch (error) {
    console.error(error);
  }
};