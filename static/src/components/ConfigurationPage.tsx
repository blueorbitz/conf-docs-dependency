import React, { useEffect, useState, useCallback } from 'react';
import { invoke, delay } from '../utils';
import {
  Content,
  Main,
  PageLayout,
} from '@atlaskit/page-layout';
import PageHeader from '@atlaskit/page-header';
import ButtonGroup from '@atlaskit/button/button-group';
import Button from '@atlaskit/button/standard-button';
import Spinner from '@atlaskit/spinner'; 
import TableTree from '@atlaskit/table-tree';
import ProgressBar from '@atlaskit/progress-bar';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';

const PropertyKey = 'conf_link_graph';

const extractAndStoreLinks = async (page: any) => {
  const linksData = await extractPageLinks(page);
  await updateConfluenceProperty(page);
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

const updateConfluenceProperty = async (page: any) => {
  const id = page.id;
  const { metadata: { properties: { _expandable: { [PropertyKey]: propertyDefined } } } } = page;

  if (propertyDefined != null)
    await invoke('deleteContentProperty', { id, PropertyKey }); // has to delete to be able to update the version

  await invoke('updateContentProperty', { id, PropertyKey });
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

const ConfigurationPage = () => {
  const [spaces, setSpaces] = useState([]);
  const [seedCount, setSeedCount] = useState(-1); // 0 - 1
  const [seedMessage, setSeedMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  const fetchSpaces = async () => {
    const response = await invoke('getSpaces');
    setSpaces(response.results.filter(o => o.type !== 'personal'));
  };

  const onClickSeedPage = async () => {
    openModal();

    if (seedCount !== -1)
      return; // Don't let the seeding to continue run

    setSeedCount(0);
    let i = 0;
    for (const space of spaces) {
      setSeedMessage(`Fetching page for "${space.key}"...`);
      const response = await invoke('getContents', space.key);
      const { page: { results: pages = [] } } = response;

      let j = 0;
      for (const page of pages) {
        setSeedMessage(`Space("${space.key}") - processing ${++j} of ${pages.length} pages...`);

        const { status, metadata: { properties: { _expandable: { [PropertyKey]: propertyDefined } } } } = page;
        if (propertyDefined != null || status !== 'current')
          continue;
        await extractAndStoreLinks(page);
      }

      await delay(500);
      setSeedCount(++i/spaces.length);
    }

    await delay(1000);
    setSeedCount(1);
    setSeedMessage('');
  };

  const onClickResetProperty = async () => {
    if (resetLoading)
      return;

    setResetLoading(true);
    for (const space of spaces) {
      const response = await invoke('getContents', space.key);
      const { page: { results: pages = [] } } = response;

      for (const page of pages) {
        const { metadata: { properties: { _expandable: { [PropertyKey]: propertyDefined } } } } = page;
        console.log('delete meta:', page.id, page.title, page.metadata.properties._expandable);
        if (propertyDefined != null)
          await invoke('deleteContentProperty', { id: page.id, PropertyKey });
      }
    }

    await delay(500);
    setResetLoading(false);
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  // Header component
  const actionsContent = (
    <ButtonGroup>
      <Button onClick={onClickResetProperty} isDisabled={resetLoading}>
        {
          resetLoading
            ? <React.Fragment>Resetting <Spinner size="small" /></React.Fragment>
            : 'Reset Property Key'
        }
      </Button>
      <Button appearance="primary" onClick={onClickSeedPage}>
        {
          seedCount === -1 || seedCount === 1
            ? 'Seed Page'
            : <React.Fragment>Seeding <Spinner appearance="invert" size="small" /></React.Fragment>
        }
      </Button>
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

        <ModalTransition>
          {isOpen && (
            <Modal onClose={closeModal} shouldCloseOnOverlayClick={false}>
              <ModalHeader>
                <ModalTitle>Seeding in progress...</ModalTitle>
              </ModalHeader>
              <ModalBody>
                <ProgressBar
                  isIndeterminate={seedCount === -1}
                  appearance={seedCount === 1 ? 'success' : 'default'}
                  ariaLabel={`Done: ${seedCount * 100} completed`}
                  value={seedCount}
                />
                <span>{seedMessage}</span>
                <p>We require you to leave this page alone as we working on linking the page together.</p>
              </ModalBody>
              <ModalFooter>
                <Button appearance="subtle" onClick={closeModal}>
                  Close
                </Button>
              </ModalFooter>
            </Modal>
          )}
        </ModalTransition>
      </Content>
    </PageLayout>
  );
};

export default ConfigurationPage;