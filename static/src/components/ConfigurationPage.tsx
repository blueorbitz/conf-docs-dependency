import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { invoke, delay, log } from '../utils';
import {
  PropertyKey, PropertyValue,
  extractKeyProperty,
  extractAndStoreLinks,
} from '../utils/logic';
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
import { Checkbox } from '@atlaskit/checkbox';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import CheckCircleIcon from '@atlaskit/icon/glyph/check-circle';
import CrossCircleIcon from '@atlaskit/icon/glyph/cross-circle';

const TableStyled = styled.div`
  border: 3px solid #dfe1e6;
  margin: auto;
`;

const ConfigurationPage = () => {
  const [spaces, setSpaces] = useState();
  const [seedCount, setSeedCount] = useState(-1); // 0 - 1
  const [seedMessage, setSeedMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const [isOpen, setIsOpen] = useState(false);
  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => {
    setIsOpen(false);
    if (seedCount === 1) // reset
      setSeedCount(-1);
  }, [seedCount]);
  const checkedSpace = {};

  const fetchSpaces = async () => {
    const response = await invoke('getSpaces');
    const spaces = response.results.filter(o => o.type !== 'personal');

    setSpaces(spaces);

    const reponseProps = await Promise.all(
      spaces.map(space => invoke('spaceProperty', { method: 'GET', spaceKey: space.key, PropertyKey }))
    );

    // merge spaces
    setSpaces(spaces.map((space, i) => ({ ...space, property: reponseProps[i] })));
  };

  const onClickSeedPage = async () => {
    openModal();

    if (seedCount !== -1)
      return; // Don't let the seeding to continue run

    setErrorMessage(null);
    setSeedCount(0);
    let i = 0;

    try {
      for (const space of spaces ?? []) {
        if (checkedSpace[space.key] !== true)
          continue;

        setSeedMessage(`Fetching page for "${space.key}"...`);
        const contents = await invoke('getContents', space.key);
        const { page: { results: pages = [] } } = contents;

        let j = 0;
        for (const page of pages) {
          setSeedMessage(`Space("${space.key}") - processing ${++j} of ${pages.length} pages...`);

          const { status, propertyDefined } = extractKeyProperty(page);
          if (propertyDefined != null || status !== 'current')
            continue;
          await extractAndStoreLinks(page);
        }

        if (space.property.value == null || space.property.value !== 'loaded') {
          await invoke('spaceProperty', { method: 'DELETE', spaceKey: space.key, PropertyKey });
          await invoke('spaceProperty', { method: 'POST', spaceKey: space.key, PropertyKey, body: PropertyValue });
        }

        await delay(500);
        setSeedCount(++i / (spaces ?? []).length);
      }
    } catch (error) {
      console.log(error);
      setErrorMessage(error.message);
    } finally {
      await delay(1000);
      setSeedCount(1);
      setSeedMessage('');
      await fetchSpaces();
    }
  };

  const onClickResetProperty = async () => {
    if (resetLoading)
      return;

    setResetLoading(true);

    try {
      for (const space of spaces ?? []) {
        if (checkedSpace[space.key] !== true)
          continue;

        await invoke('spaceProperty', { method: 'DELETE', spaceKey: space.key, PropertyKey });

        const contents = await invoke('getContents', space.key);
        const { page: { results: pages = [] } } = contents;

        for (const page of pages) {
          const { propertyDefined } = extractKeyProperty(page);
          log('delete meta:', page.id, page.title);
          if (propertyDefined != null)
            await invoke('contentProperty', { method: 'DELETE', id: page.id, PropertyKey });
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      await delay(500);
      setResetLoading(false);
      await fetchSpaces();
    }
  };

  const onClickResetGraph = async () => {
    if (resetLoading)
      return;

    setResetLoading(true);

    try {
      const cypher = 'MATCH (n {instance: "::instance::"}) DETACH DELETE n;';
      console.log(await invoke('queryCypher', cypher));
    } catch (error) {
      console.error(error);
    } finally {
      await delay(500);
      setResetLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  // Header component
  const actionsContent = (
    <ButtonGroup>
      <Button onClick={onClickResetGraph} isDisabled={resetLoading}>
        {
          resetLoading
            ? <React.Fragment>Resetting <Spinner size="small" /></React.Fragment>
            : 'Reset Graph (All Space)'
        }
      </Button>
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
  const Space = (props) => <Checkbox
    value={props.name}
    label={props.name}
    onChange={e => checkedSpace[props.name] = e.currentTarget.checked}
    name={props.name}
    testId={props.name}
  />;
  const Loaded = (props) => <span>{props.loaded}</span>;
  const items = (spaces ?? []).map(o => ({
    id: '' + o.id,
    content: {
      name: o.key,
      loaded: o.property == null
        ? <Spinner size="small" />
        : (o.property.value === 'loaded' ? <CheckCircleIcon label="???" primaryColor="green" /> : <CrossCircleIcon label="???" primaryColor="red" />),
    },
    hasChildren: false,
    children: [],
  }));

  return (
    <PageLayout>
      <Content testId="content">
        <Main testId="main" id="main" skipLinkTitle="Main Content">
          <PageHeader actions={actionsContent} >
            Setup Pages
          </PageHeader>
          {
            spaces == null
              ? <Spinner size="large" />
              : <TableStyled>
                <TableTree
                  columns={[Space, Loaded]}
                  headers={['Spaces', 'Status']}
                  columnWidths={['500px', '500px']}
                  items={items}
                />
              </TableStyled>
          }
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
                <span>{errorMessage || seedMessage}</span>
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