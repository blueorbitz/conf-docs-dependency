import React, { useEffect, useState, useRef } from 'react';
import useResizeAware from 'react-resize-aware';
import { invoke } from '../utils';
import styled from 'styled-components';
import Select from '@atlaskit/select';
import {
  Content,
  Main,
  PageLayout,
} from '@atlaskit/page-layout';
import PageHeader from '@atlaskit/page-header';
import TableTree from '@atlaskit/table-tree';
import * as vis from 'vis-network';
import Button from '@atlaskit/button';
import { router } from '@forge/bridge';

const RelativePostition = styled.div`
  position: relative;
  padding: 10px 0 10px 0;
`;

const VisDiv = styled.div`
  height: ${props => props.theme.height * 1.5}px;
  border: 1px solid #dfe1e6;
  font: 22pt arial;
`;

const VisualizeNodePage = () => {
  // let network = null;
  let nodes = [];
  let edges = [];

  const [network, setNetwork] = useState(null);
  const [spaces, setSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState([]);
  const [selectedNode, setSelectedNode] = useState({});
  const visRef = useRef();
  const [resizeListener, sizes] = useResizeAware();

  const fetchSpaces = async () => {
    const response = await invoke('getSpaces');
    const spaces = response.results.filter(o => o.type !== 'personal');
    setSpaces(spaces);
  };

  const fetchGraph = async () => {
    let cypher = '';
    if (selectedSpace.length) {
      cypher = `MATCH p = (page:PAGE)-[:LINKS]->(linkTo)
        WHERE page.space IN ${JSON.stringify(selectedSpace.map(o => o.value))}
        AND page.instance="::instance::"
        RETURN p;`;
    } else {
      cypher = `MATCH p = (page:PAGE)-[:LINKS]->(linkTo)
        WHERE page.instance="::instance::"
        RETURN p;`;
    }
    const response = await invoke('queryCypher', cypher);
    return response;
  };

  const updateNodeAndEdge = (record) => {
    record.map(updateVisData);

    // unique for non repeating
    nodes = [...new Map(nodes.map((item) => [item['id'], item])).values()];
    edges = [...new Map(edges.map((item) => [item['id'], item])).values()];
  };

  const updateVisData = (p) => {    
    const { _fields: [v] } = p;
  
    const buildNodeVisObject = (node) => {
      let label, group;
      switch(node.labels[0]) {
        case 'PAGE':
          label = node.properties.title;
          group = node.properties.space;
          break;
        case 'EXT_URL':
          label = node.properties.hostname;
          group = node.labels[0];
          break;
        case 'JIRA':
          label = node.properties.issueKey;
          group = node.labels[0];
          break;
      }

      return {
        id: parseInt(node.elementId),
        label, group,
        raw: node,
      };
    };
  
    const buildEdgeVisObject = (edge) => ({
      id: parseInt(edge.elementId),
      from: parseInt(edge.startNodeElementId),
      to: parseInt(edge.endNodeElementId),
      raw: edge,
    });
  
    nodes.push(buildNodeVisObject(v.start));
    nodes.push(buildNodeVisObject(v.end));
  
    for (const obj of v.segments) {
      nodes.push(buildNodeVisObject(obj.start));
      nodes.push(buildNodeVisObject(obj.end));
      edges.push(buildEdgeVisObject(obj.relationship));
    }
  };

  const initVis = async () => {
    const record = await fetchGraph();
    updateNodeAndEdge(record);
  
    // create a network
    const container = document.getElementById('vis');
    const data = {
      nodes: nodes,
      edges: edges,
    };
    const options = {
      nodes: {
        shape: 'dot',
        size: 24,
        borderWidth: 2,
      },
      edges: {
        width: 1,
      },
    };

    const _network = new vis.Network(container, data, options);
    _network.on('selectNode', (e) => {
      const clickedNode = nodes.find(o => o.id === e.nodes[0]);
      // console.log('selectNode', clickedNode);
      const displayNode = { ...clickedNode.raw.properties };
      delete displayNode.instance;
      setSelectedNode(displayNode);
    });
    setNetwork(_network);
  };

  const handleRedirect = (node) => {
    if (node['url']) {
      router.open(node['url']);
    }

    if (node['issueKey']) {
      router.open(`/browse/${node['issueKey']}`);
    }

    if (node['space'] && node['id']) {
      router.open(`/wiki/spaces/${node['space']}/pages/${node['id']}/`);
    }
  } 

  useEffect(() => {
    initVis();
    fetchSpaces();
  }, []);

  useEffect(() => {
    (async () => {
      const record = await fetchGraph();
      updateNodeAndEdge(record);
      network.setData({ nodes, edges });
      network.redraw();
    })();
  }, [selectedSpace]);

  const visSize = { width: sizes.width - 50, height: 350 };

  return (
    <PageLayout>
      <Content testId="content">
        <Main testId="main" id="main" skipLinkTitle="Main Content">
          <PageHeader>
            Visualize Connections
          </PageHeader>
          <Select
            inputId="multi-select-example"
            className="multi-select"
            classNamePrefix="react-select"
            value={selectedSpace}
            onChange={value => setSelectedSpace(value as any)}
            options={spaces.map(space => ({ label: space.name, value: space.key }))}
            isMulti
            isSearchable={false}
            placeholder="Select Space"
          />
          <br />
          <RelativePostition>
            {resizeListener}
            <VisDiv id="vis" ref={visRef} theme={visSize} />
          </RelativePostition>
          {Object.keys(selectedNode).length > 0 && (
            <>
              <br />
              <TableTree
                columns={[(props) => <span>{props.property}</span>, (props) => <span>{props.value}</span>]}
                headers={['Property', 'Value']}
                columnWidths={['500px', '500px']}
                items={Object.entries(selectedNode).map(([key, value]) => ({
                  id: key,
                  content: { property: key, value },
                  hasChildren: false,
                  children: [],
                }))}
              />
              <Button onClick={() => handleRedirect(selectedNode)} appearance="primary" style={{ marginTop: '30px' }}>Open Link</Button>
            </>
          )}
        </Main>
      </Content>
    </PageLayout>
  );
};

export default VisualizeNodePage;