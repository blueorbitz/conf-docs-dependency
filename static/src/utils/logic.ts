import { invoke, log } from '../utils';

export const PropertyKey = 'conf_link_graph';
export const PropertyValue = JSON.stringify({ value: 'loaded' });

export const extractKeyProperty = (page: any) => {
  const { status, metadata: { properties: { _expandable: { [PropertyKey]: propertyDefined } } } } = page;
  return { status, propertyDefined };
};

export  const extractAndStoreLinks = async (page: any) => {
  const linksData = await extractPageLinks(page);
  await updateConfluenceProperty(page);
  await storeLinksGraph(linksData);
};

const extractPageLinks = async (page: any) => {
  const response = await invoke('getContent', page.id);
  const { body: { storage: { value: body } }, space } = response;
  log('\n#########Body ', page.id, page.title);

  const extractValue = await invoke('extractPageLinks', body);
  const { links, jira, conf } = extractValue;

  // map page.id for conf
  const confDocs = [];
  const isExistDoc = ({ spaceKey, title }) => {
    const toRef = ({ spaceKey, title }) => `${spaceKey}##${title}`;
    return confDocs.findIndex(x => toRef(x) === toRef({ spaceKey, title })) !== -1;
  };

  for (let i = 0; i < conf.length; i++) {
    const { title } = conf[i];
    let { spaceKey } = conf[i];

    spaceKey = spaceKey || space.key; // overwrite default if empty
    if (isExistDoc({ spaceKey, title }))
      continue;

    const cqlResponse = await invoke('getPageId', { spaceKey, title });

    let id = '0';
    const { results } = cqlResponse;
    if (results.length)
      id = results[0].id;

    confDocs.push({ id, title, spaceKey: spaceKey });
  }

  return { space, page, links, confDocs, jira };
};

const updateConfluenceProperty = async (page: any) => {
  const { propertyDefined } = extractKeyProperty(page);

  if (propertyDefined != null)
    await invoke('contentProperty', { method: 'DELETE', id: page.id, PropertyKey }); // has to delete to be able to update the version

  await invoke('contentProperty', { method: 'POST', id: page.id, PropertyKey, body: PropertyValue });
};

const storeLinksGraph = async (linkData: any) => {
  const { space, page, links, confDocs, jira } = linkData;

  const queries = [];
  queries.push({ label: 'PAGE', id: page.id, title: page.title, space: space.key });

  links.forEach(link => {
    queries.push({ relation: page.id, label: 'EXT_URL', url: link });
  });

  confDocs.forEach(confDoc => {
    queries.push({ relation: page.id, label: 'PAGE', id: confDoc.id, title: confDoc.title, space: confDoc.spaceKey });
  });

  jira.forEach(key => {
    queries.push({ relation: page.id, label: 'JIRA', issueKey: key });
  });

  await invoke('postMergeGraph', JSON.stringify(queries));
};
