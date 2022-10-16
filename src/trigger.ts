import { isForge, log, cypher } from './utils';
import { getContent, extractPageLinks, queryCypher, getPageId } from './resolver';

export const onchange = async (event, context) => {
  const pageId = event.content.id;
  const { page, body, siteUrl } = await retrieveBaseInfo(context, pageId);
  context.siteUrl = siteUrl;

  const extract = await extractPageLinks({ payload: body, context });
  const { jira: jiraNew, links: extUrlNew, conf: confNew } = extract;

  // fetch neo4j existing graph for this node
  const queryPage = `MATCH (n { id: "${pageId}", instance: "::instance::" })-->(m) RETURN m;`;
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
  const confNodes = nodes.filter(o => o.label === 'PAGE');

  // process label
  await _processJira(context, { page, jiraNew, jiraNodes });
  await _processExtUrl(context, { page, extUrlNew, extUrlNodes });
  await _processConf(context, { page, confNew, confNodes });

  return true;
};

const retrieveBaseInfo = async (context, pageId: string) => {
  const page = await getContent({ payload: pageId, context });

  let siteUrl = '';
  if (isForge())
    siteUrl = page._links.base.slice(0, -5);
  else
    siteUrl = 'https://subdomain.atlassian.net'; // for testing...

  const subdomain = cypher.extractAtlSubdomain(siteUrl);
  log('subdomain:', subdomain);

  // parse links
  const body = page.body.storage.value;

  return {
    page, body, subdomain, siteUrl
  };
};

const _processJira = async (context, { page, jiraNew, jiraNodes }) => {
  log('Jira compare', jiraNew, jiraNodes);

  // intersect for jira
  const intersect = jiraNew.filter(value => jiraNodes
    .map(o => o.properties.issueKey)
    .includes(value)
  );

  // new - intersect = create
  const toCreate = jiraNew.filter(o => !intersect.includes(o));
  log('toCreate', toCreate);

  // cur - intersect = delete
  const toDelete = jiraNodes.map(o => o.properties.issueKey).filter(o => !intersect.includes(o));
  log('toDelete', toDelete);

  // build cypher syntax
  let query = '';
  const { id, title, space: { key: space } } = page;
  if (toCreate.length) {
    // Make sure we have the base conf page first
    const basePage = cypher.mergePage({ title, space, id, relation: null });

    // Create and map the Jira node
    const mapLink = toCreate.map(issueKey => cypher.mergeJira({ issueKey, relation: id })).join('\n');

    query += basePage + '\n' + mapLink + '\n';
  }

  if (toDelete.length) {
    const elementIds = toDelete.map(issueKey => jiraNodes.find(o => o.properties.issueKey === issueKey).elementId);
    const deleteElements = cypher.deleteElementByIds(elementIds.map(parseInt));

    query += deleteElements + '\n';
  }

  if (query !== '')
    await queryCypher({ payload: query, context });
};

const _processExtUrl = async (context, { page, extUrlNew, extUrlNodes }) => {
  log('ExtUrl compare', extUrlNew, extUrlNodes);

  // intersect for url
  const intersect = extUrlNew.filter(value => extUrlNodes
    .map(o => o.properties.url)
    .includes(value)
  );

  // new - intersect = create
  const toCreate = extUrlNew.filter(o => !intersect.includes(o));
  log('toCreate', toCreate);

  // cur - intersect = delete
  const toDelete = extUrlNodes.map(o => o.properties.url).filter(o => !intersect.includes(o));
  log('toDelete', toDelete);

  // build cypher syntax
  let query = '';
  const { id, title, space: { key: space } } = page;
  if (toCreate.length) {
    // Make sure we have the base conf page first
    const basePage = cypher.mergePage({ title, space, id, relation: null });

    // Create and map the Jira node
    const mapLink = toCreate.map(url => cypher.mergeExtUrl({ url, relation: id })).join('\n');

    query += basePage + '\n' + mapLink + '\n';
  }

  if (toDelete.length) {
    const elementIds = toDelete.map(url => extUrlNodes.find(o => o.properties.url === url).elementId);
    const deleteElements = cypher.deleteElementByIds(elementIds.map(parseInt));

    query += deleteElements + '\n';
  }

  if (query !== '')
    await queryCypher({ payload: query, context });
};

const _processConf = async (context, { page, confNew, confNodes }) => {
  log('Conf compare', confNew, confNodes);
  const space = page.space.key;

  const response = await Promise.all(confNew.map(({ spaceKey, title }) => {
    return getPageId({ payload: JSON.stringify({ spaceKey: spaceKey || space, title }), context })
  }));

  // @ts-ignore: disable temporary as we are convinces that results will always have value
  const pageIds = response.map(o => o.results[0].id)
  for (let i = 0; i < confNew.length; i++) {
    confNew[i].id = pageIds[i];
    confNew[i].spaceKey = confNew[i].spaceKey || space;
  }

  // intersect for url
  const intersect = confNew.filter(value => confNodes
    .map(o => o.properties.id)
    .includes(value.id)
  );

  // new - intersect = create
  const toCreate = confNew.filter(o => !intersect.includes(o));
  log('toCreate', toCreate);

  // cur - intersect = delete
  const toDelete = confNodes.map(o => o.properties.id)
    .filter(id => intersect.find(o => o.id === id) === undefined);
  log('toDelete', toDelete);

  // build cypher syntax
  let query = '';
  const { id: relationId, title } = page;

  if (toCreate.length) {
    // Make sure we have the base conf page first
    const basePage = cypher.mergePage({ title, space, id: relationId, relation: null });
    query += basePage + '\n';

    // Create and map the Conf node
    const mapLink = toCreate.map(({ spaceKey: space, title, id }) =>
      cypher.mergePage({ space, title, id, relation: relationId })).join('\n');
    query += mapLink + '\n';
  }

  if (toDelete.length) {
    const elementIds = toDelete.map(id => confNodes.find(o => o.properties.id === id).elementId);
    const deleteRelation = cypher.deleteRelationByIds(relationId, elementIds.map(parseInt));

    query += deleteRelation + '\n';
  }

  if (query !== '')
    await queryCypher({ payload: query, context });
};
