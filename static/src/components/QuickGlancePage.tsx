import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { invoke } from '../utils';
import { router } from '@forge/bridge';

const PNoMargin = styled.p`
  margin-top: 0px;
`;

const QuickGlancePage = ({ context }) => {
  const [connectedPage, setConnectedPage] = useState([]);
  const [isLoad, setIsLoad] = useState(false);

  const fetchGraph = async () => {
    const cypher = `MATCH (p:PAGE { id: "${context.extension.content.id}" })<--(o:PAGE)
      WHERE p.instance = "::instance::"
      return o.id, o.space, o.title`;
    const response = await invoke('queryCypher', cypher);

    setConnectedPage(response.map(o => {
      const [pageId, space, title] = o._fields;
      return { pageId, space, title };
    }));

    setIsLoad(true);
    return response;
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  return <React.Fragment>
    <h3>Glance connection</h3>
    <PNoMargin>Confluence page that has linked to this page.</PNoMargin>
    {
      isLoad && connectedPage.length === 0
        ? <p>No page is referencing to this.</p>
        : null
    }
    <ul>
      {connectedPage.map(o => {
        return <li>
          <a onClick={() => router.open(`/wiki/spaces/${o.space}/pages/${o.pageId}/`)}><strong>{o.title}</strong></a>
          <br />
          <small>{o.space}</small>
        </li>;
      })}
    </ul>
  </React.Fragment>;
};

export default QuickGlancePage;