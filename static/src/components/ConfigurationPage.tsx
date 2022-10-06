import React, { useEffect, useState } from 'react';
import { invoke } from '../utils';
import {
  Content,
  Main,
  PageLayout,
} from '@atlaskit/page-layout';
import PageHeader from '@atlaskit/page-header';
import ButtonGroup from '@atlaskit/button/button-group';
import Button from '@atlaskit/button/standard-button';
import TableTree from '@atlaskit/table-tree';

const PropertyKey = 'conf_link_graph';

const ConfigurationPage = () => {
  const [spaces, setSpaces] = useState([]);

  const fetchSpaces = async () => {
    const response = await invoke('getSpaces');
    setSpaces(response.results.filter(o => o.type !== 'personal'));
  };

  const onClickSeedPage = async () => {
    for (const space of spaces) {
      const response = await invoke('getContents', space.key);
      const { page: { results: pages = [] } } = response;

      for (const page of pages) {
        const { status, metadata: { properties: { _expandable: { [PropertyKey]: hasProperty } } } } = page;
        if (hasProperty != null && status !== 'current')
          continue;
        await extractAndStoreLinks(page);
        break;
      }
    }
  };
  
  const extractAndStoreLinks = async (page: any) => {
    const linksData = await extractPageLinks(page);
    // await updateConfluenceProperty(id); // Add this then confirm, or need a easier way to reset
    await storeLinksGraph(linksData);
  };

  const extractPageLinks = async (page: any) => {
    const response = await invoke('getContent', page.id);
    const { body: { storage: { value: body } }, space } = response;
    console.log('\n#########Body ', page.id, page.title);

    const links = [...body.matchAll(/href="(\S{7,})"/g)]
      .map(o => o[1])
      .filter((value, index, self) => self.indexOf(value) === index); // unique
    console.log('links', links);

    // extract pages
    const confDocs = [];
    for (let cur = 0; cur !== -1; ) {
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
      let spaceKey = space.key;
      if (curSpaceEnd !== -1 && curSpaceStart !== -1)
        spaceKey = tag.slice(curSpaceStart + 14, curSpaceEnd);

      const cqlResponse = await invoke('getPageId', { spaceKey, title });

      let id = '0';
      const { results } = cqlResponse;
      if (results.length) id = results[0].id;

      if (confDocs.findIndex(x => x.id === id) === -1)
        confDocs.push({ id, title, spaceKey: spaceKey });
    }
    console.log('confDocs', confDocs);

    const jira = [...body.matchAll(/<ac:parameter ac:name="key">(\S+)<\/ac:parameter>/g)]
      .map(o => o[1])
      .filter((value, index, self) => self.indexOf(value) === index); // unique
    console.log('jira', jira);

    return { space, page, links, confDocs, jira };
  };
  
  const storeLinksGraph = async (linkData: any) => {
    const { space, page, links, confDocs, jira } = linkData;

    const prefix = '::prefix::';
    const idConf = (id: string) => prefix + '_page_' + id;
    const idUrl = (s: string) => prefix + '_url_' + s.replace(/[^a-zA-Z]/g, '');
    const idJira = (key: string) => prefix + '_jira_' + key.replace('-', '_');

    const queries = [];
    queries.push(`(${idConf(page.id)}:PAGE { title: '${page.title}', space: '${space.key}', id: '${page.id}' })`);

    links.forEach(link => {
      queries.push(`(${idUrl(link)}:EXTERNAL_URL { url: '${link}' })`);
      queries.push(`(${idConf(page.id)})-[:LINKS]->(${idUrl(link)})`);
    });

    confDocs.forEach(confDoc => {
      queries.push(`(${idConf(confDoc.id)}:PAGE { title: '${confDoc.title}', space: '${confDoc.spaceKey}', id: '${confDoc.id}' })`);
      queries.push(`(${idConf(page.id)})-[:LINKS]->(${idConf(confDoc.id)})`);
    });

    jira.forEach(key => {
      queries.push(`(${idJira(key)}:JIRA { issueKey: '${key}' })`);
      queries.push(`(${idConf(page.id)})-[:LINKS]->(${idJira(key)})`);
    });

    await invoke('postMergeGraph', JSON.stringify(queries));
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  // Header component
  const actionsContent = (
    <ButtonGroup>
      <Button>Force Reload</Button>
      <Button appearance="primary" onClick={onClickSeedPage}>Seed Page</Button>
    </ButtonGroup>
  );

  // Table component
  const Space = (props) => <span>{props.name}</span>;
  const Loaded = (props) => <span>{props.loaded}</span>;
  const items = spaces.map(o => ({
    id: '' + o.id,
    content: {
      name: o.key,
      loaded: o.metadata._expandable[PropertyKey] ? 'true' : 'false',
    },
    hasChildren: false,
    children: [],
  }));

  return (
    <PageLayout>
      <Content testId="content">
        <Main testId="main" id="main" skipLinkTitle="Main Content">
          <PageHeader actions={actionsContent} >
            Conf Docs Dependency | Admin
          </PageHeader>
          <TableTree
            columns={[Space, Loaded]}
            headers={['Space', 'Loaded']}
            columnWidths={['250px', '100px']}
            items={items}
          />
        </Main>
      </Content>
    </PageLayout>
  );
};

export default ConfigurationPage;