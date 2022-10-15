import { log, requestConfluence, fetch } from './utils';

const getSubdomain = (siteUrl: string) => siteUrl.match(/https:\/\/(\S+).atlassian.net/)[1];

export const getText = async (req: any) => {
  log(req);
  return 'Hello, world!';
};

export const getContext = async (req: any) => {
  return { ...req.context };
};

export const getSpaces = async (req: any) => {
  const response = await requestConfluence('/wiki/rest/api/space?expand=metadata.properties&limit=99');

  log(`getSpaces: ${response.status} ${response.statusText}`);
  return await response.json();
};

export const getContents = async (req: any) => {
  const spaceKey = req.payload;
  const response = await requestConfluence(`/wiki/rest/api/space/${spaceKey}/content?expand=metadata.properties&limit=99`);

  log(`getContents: ${response.status} ${response.statusText}`);
  return await response.json();
}

export const getContent = async (req: any) => {
  const pageId = req.payload;
  const response = await requestConfluence(`/wiki/rest/api/content/${pageId}?expand=body.storage,space`);

  log(`getContents: ${response.status} ${response.statusText}`);
  return await response.json();
};

export const getPageId = async (req: any) => {
  const { spaceKey, title } = JSON.parse(req.payload);
  log('getPageId', spaceKey, title);
  const response = await requestConfluence(`/wiki/rest/api/content/search?cql=type=page AND space="${spaceKey}" AND title="${title}"&limit=1`);

  log(`getPageId: ${response.status} ${response.statusText}`);
  return await response.json();
};

export const contentProperty = async (req: any) => {
  const { method, id, PropertyKey, body } = JSON.parse(req.payload);

  const response = await requestConfluence(`/wiki/rest/api/content/${id}/property/${PropertyKey}`, {
    method, body,
  });

  log(`contentProperty[${method}]: ${response.status} ${response.statusText}`);
  if (response.status !== 200)
    return { status: response.status, statusText: response.statusText };

  return await response.json();
}

export const spaceProperty = async (req: any) => {
  const { method, spaceKey, PropertyKey, body } = JSON.parse(req.payload);

  const response = await requestConfluence(`/wiki/rest/api/space/${spaceKey}/property/${PropertyKey}`, {
    method, body,
  });

  log(`spaceProperty[${method}]: ${response.status} ${response.statusText}`);
  if (response.status !== 200)
    return { status: response.status, statusText: response.statusText };

  return await response.json();
}

export const postMergeGraph = async (req: any) => {
  try {
    const { siteUrl } = req.context;

    const idConf = (id: string) => 'page_' + id;
    const idUrl = (s: string) => 'url_' + s.replace(/[^a-zA-Z]/g, '');
    const idJira = (key: string) => 'jira_' + key.replace('-', '_');

    const subdomain = getSubdomain(siteUrl);

    const query = JSON.parse(req.payload).map(node => {
      let txt = '';
      const { relation, label, id, title, space, url, issueKey } = node;
      switch (label) {
        case 'PAGE':
          txt = `MERGE (${idConf(id)}:${label} { id: '${id}', instance: '${subdomain}' })
          SET ${idConf(id)}.title = '${title}'
          SET ${idConf(id)}.space = '${space}'
          `;
          if (relation)
            txt += `MERGE (${idConf(relation)})-[:LINKS]->(${idConf(id)})`;
          break;
        case 'JIRA':
          txt = `
            MERGE (${idJira(issueKey)}:${label} { issueKey: '${issueKey}', project: '${issueKey.split('-')[0]}', instance: '${subdomain}' })
            MERGE (${idConf(relation)})-[:LINKS]->(${idJira(issueKey)})
          `;
          break;
        case 'EXT_URL':
          const hostname = new URL(url).hostname;
          txt = `
            MERGE (${idUrl(url)}:${label} { hostname: '${hostname}', url: '${url}', instance: '${subdomain}' })
            MERGE (${idConf(relation)})-[:LINKS]->(${idUrl(url)})
          `;
          break;
        default:
          log('Invalid label', node);
      };
      return txt;
    }).join('\n');

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

export const queryCypher = async (req: any) => {
  const { siteUrl } = req.context;
  const subdomain = getSubdomain(siteUrl);
  let cypher = req.payload;

  try {
    if (cypher.search('::instance::') === -1)
      return { message: 'invalid input' }; // incase people try to inject unnecessary code

    cypher = cypher.replace('::instance::', subdomain);
    log(cypher);

    const { VERCEL_NEO4J_SERVERLESS_URL } = process.env;
    const response = await fetch(VERCEL_NEO4J_SERVERLESS_URL + `/api`, {
      method: 'post',
      body: cypher,
      headers: { 'Content-Type': 'text/plain' }
    });

    log(`queryCypher: ${response.status} ${response.statusText}`);
    if (response.status !== 200)
      throw new Error(await response.json());

    return await response.json();
  } catch (error) {
    console.error(error);
  }
}

export const extractPageLinks = async (req: any) => {
  const body = req.payload;
  log('extractPageLinks:', body.substring(0, 24) + '...');

  const extractLink = (_body) => {
    return [...body.matchAll(/href="(\S{7,})"/g)]
      .map(o => o[1])
      .filter((value, index, self) => self.indexOf(value) === index); // unique
  };

  const extractJira = (_body) => {
    return [...body.matchAll(/<ac:parameter ac:name="key">(\S+)<\/ac:parameter>/g)]
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
}
