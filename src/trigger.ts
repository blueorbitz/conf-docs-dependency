import { isForge, log, cypher } from './utils';
import { getContent, extractPageLinks, queryCypher } from './resolver';

export const onchange = async (event, context) => {
  const pageId = event.content.id;
  const page = await getContent({ payload: pageId });

  if (isForge())
    context.siteUrl = page._links.base.slice(0, -5);
  else
    context.siteUrl = 'https://subdomain.atlassian.net'; // for testing...

  const siteUrl = context.siteUrl;
  log('siteUrl:', siteUrl);

  const subdomain = cypher.extractAtlSubdomain(siteUrl);
  log('subdomain:', subdomain);

  // parse links
  const body = page.body.storage.value;

  const extract = await extractPageLinks({ payload: body });
  const { jira: jiraNew, links: extUrlNew } = extract;
  log('New', jiraNew, extUrlNew);

  // fetch neo4j existing graph for this node
  const queryPage = `MATCH (n { id: "${pageId}", instance: "::instance::" })-->(m) return m;`;
  const results = await queryCypher({ payload: queryPage, context });
  const nodes = results
    .map(o => o._fields[0])
    .map(o => ({
      elementId: o.elementId,
      label: o.labels[0],
      properties: o.properties,
    }));

  // confluence docs can be ignored
  const jiraNodes = nodes.filter(o => o.label === 'JIRA');
  const extUrlNodes = nodes.filter(o => o.label === 'EXT_URL');
  log('Cur', jiraNodes, extUrlNodes);

  // intersect for jira
  const jiraIntersect = jiraNew.filter(value => jiraNodes
    .map(o => o.properties.issueKey)
    .includes(value)
  );

  const extUrlIntersect = extUrlNew.filter(value => extUrlNodes
    .map(o => o.properties.url)
    .includes(value)
  );

  log('Intersect', jiraIntersect, extUrlIntersect);

  // new - intersect = create
  const jiraToCreate = jiraNew.filter(o => !jiraIntersect.includes(o));
  const extUrlToCreate = extUrlNew.filter(o => !extUrlIntersect.includes(o));
  log('Create', jiraToCreate, extUrlToCreate);

  let cypherToCreate = '';
  if (jiraToCreate.length || extUrlToCreate.length) {
    cypherToCreate += cypher.matchRelation(pageId) + '\n'
      + jiraToCreate.map(issueKey => cypher.mergeJira({ relation: pageId, issueKey })).join('\n')
      + extUrlToCreate.map(url => cypher.mergeExtUrl({ relation: pageId, url })).join('\n');
    cypherToCreate = cypher.replaceInstance(subdomain, cypherToCreate);
  }
  console.log('cypherToCreate', cypherToCreate);
  if (cypherToCreate !== '')
    await queryCypher({ payload: cypherToCreate, context: { siteUrl } });

  // cur - intersect = delete
  const jiraToDelete = jiraNodes.map(o => o.properties.issueKey).filter(o => !jiraIntersect.includes(o));
  const extUrlToDelete = extUrlNodes.map(o => o.properties.url).filter(o => !extUrlIntersect.includes(o));
  log('Delete', jiraToDelete, extUrlToDelete);

  let cypherToDelete = '';
  if (jiraToDelete.length || extUrlToDelete.length) {
    const jiraElementIds = jiraToDelete.map(issueKey => jiraNodes.find(o => o.properties.issueKey === issueKey).elementId);
    const extUrlElementIds = extUrlToDelete.map(url => extUrlNodes.find(o => o.properties.url === url).elementId);
    cypherToDelete = cypher.deleteElementByIds([...jiraElementIds, ...extUrlElementIds].map(o => parseInt(o)));
    cypherToDelete = cypher.replaceInstance(subdomain, cypherToDelete);
  }
  console.log('cypherToDelete', cypherToDelete);
  if (cypherToDelete !== '')
    await queryCypher({ payload: cypherToDelete, context: { siteUrl } });

  return true;
};