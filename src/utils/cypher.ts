const idConf = (id: string | number) => 'page_' + id;
const idUrl = (s: string) => 'url_' + s.replace(/[^a-zA-Z0-9]/g, '');
const idJira = (key: string) => 'jira_' + key.replace('-', '_');

export const extractAtlSubdomain = (siteUrl: string) => siteUrl.match(/https:\/\/(\S+).atlassian.net/)[1];

export const replaceInstance = (subdomain: string, body: string) => body.replace(/::instance::/g, subdomain);

export const matchRelation = (id: string | number) => {
  return `MATCH (${idConf(id)}:PAGE { id: '${id}', instance: '::instance::' })`;
};

interface CypherPageInput {
  relation?: string | number,
  id: string | number,
  title: string,
  space: string,
};

export const mergePage = ({ relation, id, title, space }: CypherPageInput) => {
  let txt = '';
  txt = `MERGE (${idConf(id)}:PAGE { id: '${id}', instance: '::instance::' })
  SET ${idConf(id)}.title = '${title}'
  SET ${idConf(id)}.space = '${space}'
  `;

  if (relation)
    txt += `MERGE (${idConf(relation)})-[:LINKS]->(${idConf(id)})`;

  return txt;
};

interface CypherJiraInput {
  relation: string | number,
  issueKey: string,
};

export const mergeJira = ({ relation, issueKey }: CypherJiraInput) => {
  return `
    MERGE (${idJira(issueKey)}:JIRA { issueKey: '${issueKey}', project: '${issueKey.split('-')[0]}', instance: '::instance::' })
    MERGE (${idConf(relation)})-[:LINKS]->(${idJira(issueKey)})
  `;
};

interface CypherExtUrlInput {
  relation: string | number,
  url: string,
};

export const mergeExtUrl = ({ relation, url }: CypherExtUrlInput) => {
  const hostname = new URL(url).hostname;
  return `
    MERGE (${idUrl(url)}:EXT_URL { hostname: '${hostname}', url: '${url}', instance: '::instance::' })
    MERGE (${idConf(relation)})-[:LINKS]->(${idUrl(url)})
  `;
};

export const deleteElementByIds = (elementIds: number[]) => {
  return `
    MATCH (p { instance: '::instance::' }) WHERE ID(p) IN ${JSON.stringify(elementIds)}
    DETACH DELETE p
  `;
};

export const deleteRelationByIds = (id, elementIds: number[]) => {
  return `
    MATCH (${idConf(id)}:PAGE { id: '${id}', instance: '::instance::' })-[r:LINKS]->(p:PAGE)
    WHERE ID(p) IN ${JSON.stringify(elementIds)}
    DELETE r
  `;
};

