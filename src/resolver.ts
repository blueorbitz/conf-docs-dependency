import { log, requestConfluence, fetch, cypher } from './utils';

interface ContextInterface {
  siteUrl: string;
  cloudId?: string;
  environmentId?: string;
  environmentType?: string;
  moduleKey?: string;
  extension?: object;
  accountId?: string;
};

export interface ResolverFunction {
  context: ContextInterface;
  payload: string;
}

export const getText = async (req: ResolverFunction) => {
  log(req);
  return 'Hello, world!';
};

export const getContext = async (req: ResolverFunction) => {
  return { ...req.context };
};

export const getSpaces = async () => {
  const response = await requestConfluence('/wiki/rest/api/space?expand=metadata.properties&limit=99');

  log(`getSpaces: ${response.status} ${response.statusText}`);
  return await response.json();
};

export const getContents = async (req: ResolverFunction) => {
  const spaceKey = req.payload;
  const response = await requestConfluence(`/wiki/rest/api/space/${spaceKey}/content?expand=metadata.properties&limit=99`);

  log(`getContents: ${response.status} ${response.statusText}`);
  return await response.json();
}

export const getContent = async (req: ResolverFunction) => {
  const pageId = req.payload;
  const response = await requestConfluence(`/wiki/rest/api/content/${pageId}?expand=body.storage,space`);

  log(`getContents: ${response.status} ${response.statusText}`);
  return await response.json();
};

export const getPageId = async (req: ResolverFunction) => {
  const { spaceKey, title } = JSON.parse(req.payload);
  log('getPageId', spaceKey, title);
  const response = await requestConfluence(`/wiki/rest/api/content/search?cql=type=page AND space="${spaceKey}" AND title="${title}"&limit=1`);

  log(`getPageId: ${response.status} ${response.statusText}`);
  return await response.json();
};

export const searchTitle = async (req: ResolverFunction) => {
  const { title } = JSON.parse(req.payload);
  log('searchTitle', title);
  const response = await requestConfluence(`/wiki/rest/api/content/search?cql=type=page AND title~"${title}"&limit=8`);

  log(`searchTitle: ${response.status} ${response.statusText}`);
  return await response.json();
};

export const contentProperty = async (req: ResolverFunction) => {
  const { method, id, PropertyKey, body } = JSON.parse(req.payload);

  const response = await requestConfluence(`/wiki/rest/api/content/${id}/property/${PropertyKey}`, {
    method, body,
  });

  log(`contentProperty[${method}]: ${response.status} ${response.statusText}`);
  if (response.status !== 200)
    return { status: response.status, statusText: response.statusText };

  return await response.json();
};

export const spaceProperty = async (req: ResolverFunction) => {
  const { method, spaceKey, PropertyKey, body } = JSON.parse(req.payload);

  const response = await requestConfluence(`/wiki/rest/api/space/${spaceKey}/property/${PropertyKey}`, {
    method, body,
  });

  log(`spaceProperty[${method}]: ${response.status} ${response.statusText}`);
  if (response.status !== 200)
    return { status: response.status, statusText: response.statusText };

  return await response.json();
};

export const postMergeGraph = async (req: ResolverFunction) => {
  try {
    const { siteUrl } = req.context;

    let query = JSON.parse(req.payload).map(node => {
      const { relation, label, id, title, space, url, issueKey } = node;
      switch (label) {
        case 'PAGE':
          return cypher.mergePage({ relation, id, title, space });
        case 'JIRA':
          return cypher.mergeJira({ relation, issueKey });
        case 'EXT_URL':
          return cypher.mergeExtUrl({ relation, url });
        default:
          log('Invalid label', node);
      };
    }).join('\n');

    const subdomain = cypher.extractAtlSubdomain(siteUrl);
    query = cypher.replaceInstance(subdomain, query);

    log('postMergeGraph', query);

    const { VERCEL_NEO4J_SERVERLESS_URL } = process.env;
    const response = await fetch(VERCEL_NEO4J_SERVERLESS_URL + `/api`, {
      method: 'post',
      body: query,
      headers: { 'Content-Type': 'text/plain' }
    });

    log(`postMergeGraph: ${response.status} ${response.statusText}`);
    if (response.status !== 200)
      throw new Error(await response.json());

    return await response.json();
  } catch (error) {
    console.error(error);
  }
};

export const queryCypher = async (req: ResolverFunction) => {
  const { siteUrl } = req.context;
  let body = req.payload;

  try {
    if (body.search('::instance::') === -1)
      return { message: 'invalid input' }; // incase people try to inject unnecessary code

    const subdomain = cypher.extractAtlSubdomain(siteUrl);
    body = cypher.replaceInstance(subdomain, body);
    log(body);

    const { VERCEL_NEO4J_SERVERLESS_URL } = process.env;
    const response = await fetch(VERCEL_NEO4J_SERVERLESS_URL + `/api`, {
      method: 'post',
      body,
      headers: { 'Content-Type': 'text/plain' }
    });

    log(`queryCypher: ${response.status} ${response.statusText}`);
    if (response.status !== 200)
      throw new Error(await response.json());

    return await response.json();
  } catch (error) {
    console.error(error);
  }
};

export const extractPageLinks = async (req: ResolverFunction) => {
  const body = req.payload;
  const siteUrl = req.context.siteUrl;
  log('extractPageLinks:', body.slice(0, 24) + '...');

  const extractLink = (_body) => {
    const regexJiraLink = new RegExp(`${siteUrl}\/browse\/\\S+-\\d+`, 'g');
    const regexHttpUrl = new RegExp(`^https?:\/\/.*`, 'g');

    return [...body.matchAll(/href="(\S{7,})"/g)]
      .map(o => o[1])
      .filter(url => !url.match(regexJiraLink)) // remove Jira
      .filter(url => url.match(regexHttpUrl)) // remove local
      .filter((value, index, self) => self.indexOf(value) === index); // unique
  };

  const extractJira = (_body) => {
    const regexJiraHref = new RegExp(`href="${siteUrl}\/browse\/(\\S+-\\d+)"`, 'g');
    return [
      ...body.matchAll(/<ac:parameter ac:name="key">(\S+)<\/ac:parameter>/g),
      ...body.matchAll(regexJiraHref),
    ]
      .map(o => o[1])
      .filter((value, index, self) => self.indexOf(value) === index); // unique
  };

  const extractConf = (_body) => {
    const conf = [];
    for (let cur = 0; cur !== -1;) {
      cur = body.indexOf('<ri:page', cur);
      if (cur === -1) continue;

      const end = body.indexOf('/>', cur);
      const tag = body.slice(cur, end + 2);
      cur = end;

      const curTitleStart = tag.indexOf('ri:content-title=', 0);
      const curTitleEnd = tag.indexOf('"', curTitleStart + 18);
      const title = tag.slice(curTitleStart + 18, curTitleEnd);

      const curSpaceStart = tag.indexOf('ri:space-key=', 0);
      const curSpaceEnd = tag.indexOf('"', curSpaceStart + 14);
      let spaceKey = '';
      if (curSpaceEnd !== -1 && curSpaceStart !== -1)
        spaceKey = tag.slice(curSpaceStart + 14, curSpaceEnd);

      conf.push({ spaceKey, title });
    }
    return conf;
  };

  return {
    links: extractLink(body),
    jira: extractJira(body),
    conf: extractConf(body),
  };
};
