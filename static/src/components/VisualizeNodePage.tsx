import React, { useEffect, useState, useRef } from 'react';
import useResizeAware from 'react-resize-aware';
import { invoke } from '../utils';
import styled, { keyframes } from 'styled-components';
import Select from '@atlaskit/select';
import {
  Content,
  Main,
  PageLayout,
} from '@atlaskit/page-layout';
import PageHeader from '@atlaskit/page-header';
import TableTree from '@atlaskit/table-tree';
import NeoVis from 'neovis.js/dist/neovis.js';

const RelativePostition = styled.div`
  position: relative;
`;

const VizDiv = styled.div`
  width: ${props => props.theme.width}px;
  height: ${props => props.theme.height}px;
  border: 1px solid lightgray;
  font: 22pt arial;
`;

const VisualizeNodePage = () => {
  let neoViz = null;
  const [spaces, setSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState([]);
  const [selectedNode, setSelectedNode] = useState({});
  const vizRef = useRef();
  const [resizeListener, sizes] = useResizeAware();

  const fetchSpaces = async () => {
    const response = await invoke('getSpaces');
    const spaces = response.results; //.filter(o => o.type !== 'personal');
    setSpaces(spaces);
  };

  const initNeovis = async () => {
    const neovisConfig = {
      containerId: 'viz',
      neo4j: await invoke('neo4jConnection'),
      visConfig: {
        nodes: { shape: 'square' },
        edges: { arrows: { to: { enabled: true } } },
      },
      labels: {
        PAGE: { label: 'title', group: 'space' },
        EXTERNAL_URL: { label: 'hostname' },
        JIRA: { label: 'issueKey', group: 'project' },
      },
      initialCypher: `
        MATCH p = (page:PAGE)-[:LINKS]->(linkTo)
        RETURN p
      `,
    };

    try {
      neoViz = new NeoVis(neovisConfig);
      neoViz.render();
      neoViz.registerOnEvent('clickNode', (e) => {
        console.log('clicked', e, e.node.raw.properties);
        setSelectedNode({ ...e.node.raw.properties });
      });
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchSpaces();
    initNeovis();
  }, []);

  useEffect(() => {
    if (selectedSpace.length === 0)
      return;

    const _spaces = selectedSpace.map(o => o.value);
    const cypher = `
      MATCH p = (page:PAGE)-[:LINKS]->(linkTo)
      WHERE page.space IN ${JSON.stringify(_spaces)}
      RETURN p
    `;
    console.log(cypher);
    neoViz.renderWithCypher(cypher.trim());
  }, [selectedSpace]);

  const vizSize = { width: sizes.width - 50, height: 350 };

  return (
    <PageLayout>
      <Content testId="content">
        <Main testId="main" id="main" skipLinkTitle="Main Content">
          <PageHeader>
            Visualize Connections
          </PageHeader>
          <label htmlFor="multi-select-example">Select spaces to visualize connection?</label>
          <Select
            inputId="multi-select-example"
            className="multi-select"
            classNamePrefix="react-select"
            value={selectedSpace}
            onChange={value => setSelectedSpace(value as any)}
            options={spaces.map(space => ({ label: space.name, value: space.key }))}
            isMulti
            isSearchable={false}
            placeholder="Choose a space to start"
          />
          <p></p>
          <RelativePostition>
            {resizeListener}
            <VizDiv id="viz" ref={vizRef} theme={vizSize} />
          </RelativePostition>
          <p></p>
          <TableTree
            columns={[(props) => <span>{props.property}</span>, (props) => <span>{props.value}</span>]}
            headers={['Property', 'Value']}
            columnWidths={['150px', '']}
            items={Object.entries(selectedNode).map(([key, value]) => ({
              id: key,
              content: { property: key, value },
              hasChildren: false,
              children: [],
            }))}
          />
        </Main>
      </Content>
    </PageLayout>
  );
};

export default VisualizeNodePage;