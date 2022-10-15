const idConf = (id: string) => 'page_' + id;
const idUrl = (s: string) => 'url_' + s.replace(/[^a-zA-Z0-9]/g, '');
const idJira = (key: string) => 'jira_' + key.replace('-', '_');

export const extractAtlSubdomain = (siteUrl: string) => siteUrl.match(/https:\/\/(\S+).atlassian.net/)[1];

export const replaceInstance = (subdomain: string, body: string) => body.replace(/::instance::/g, subdomain);

export const matchRelation = (id) => {
  return `MATCH (${idConf(id)}:PAGE { id: '${id}', instance: '::instance::' })`;
};

export const mergePage = ({ relation, id, title, space }) => {
  let txt = '';
  txt = `MERGE (${idConf(id)}:PAGE { id: '${id}', instance: '::instance::' })
  SET ${idConf(id)}.title = '${title}'
  SET ${idConf(id)}.space = '${space}'
  `;

  if (relation)
    txt += `MERGE (${idConf(relation)})-[:LINKS]->(${idConf(id)})`;

  return txt;
};

export const mergeJira = ({ relation, issueKey }) => {
  return `
    MERGE (${idJira(issueKey)}:JIRA { issueKey: '${issueKey}', project: '${issueKey.split('-')[0]}', instance: '::instance::' })
    MERGE (${idConf(relation)})-[:LINKS]->(${idJira(issueKey)})
  `;
};

export const mergeExtUrl = ({ relation, url }) => {
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

