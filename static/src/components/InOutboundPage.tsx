import React, { ReactElement, useEffect, useState } from 'react';
import { invoke } from '../utils';
import TableTree from '@atlaskit/table-tree';

type Content = { type: string; display: ReactElement };
type Item = {
  id: string;
  content: Content;
  hasChildren: boolean;
  children?: Item[];
};

// const items: Item[] = [
//   {
//     id: 'item1',
//     content: {
//       title: 'Item 1',
//       description: 'First top-level item',
//     },
//     hasChildren: false,
//     children: [],
//   },
//   {
//     id: 'item2',
//     content: {
//       title: 'Item 2',
//       description: 'Second top-level item',
//     },
//     hasChildren: true,
//     children: [
//       {
//         id: 'child2.1',
//         content: {
//           title: 'Child item',
//           description: 'A child item',
//         },
//         hasChildren: false,
//       },
//     ],
//   },
// ];

const LinkType = (props: Content) => <span>{props.type}</span>;
const LinkDisplay = (props: Content) => props.display;

const InOutboundPage = ({ context }) => {
  const pageId = context.extension.content.id;
  const [inbounds, setInbounds] = useState([]);
  const [outbounds, setOutbounds] = useState([]);
  const items: Item[] = [];

  const fetchInbound = async () => {
    const cypher = `MATCH (inbound)-[:LINKS]->(page:PAGE)
      WHERE page.id="${pageId}"
      AND page.instance="::instance::"
      RETURN inbound;`;

    const response = await invoke('queryCypher', cypher);
    setInbounds(response.map(o => o._fields[0]));
    return response;
  };

  const fetchOutbound = async () => {
    const cypher = `MATCH (page:PAGE)-[:LINKS]->(outbound)
      WHERE page.id="${pageId}"
      AND page.instance="::instance::"
      RETURN outbound`;

    const response = await invoke('queryCypher', cypher);
    setOutbounds(response.map(o => o._fields[0]));
    return response;
  };

  const mapChildren = (bound, field, index): Item => {
    console.log(bound, field, index);
    const node = field.properties;
    let title = '';
    let href = '';

    if (node.url != null) {
      title = node.hostname;
      href = node.url;
    }

    else if (node.issueKey != null) {
      title = `Jira issue key: ${node.issueKey}`;
      href = `${context.siteUrl}/browse/${node.issueKey}`;
    }

    else if (node.space != null && node.id != null) {
      title = node.title;
      href = `${context.siteUrl}/wiki/spaces/${node.space}/pages/${node.id}/`;
    }

    return {
      id: `${bound}.${index}`,
      content: {
        type: field.labels[0],
        display: <a href={href}>{title}</a>,
      },
      hasChildren: false,
    };
  };

  useEffect(() => {
    (async () => {
      await fetchInbound();
      await fetchOutbound();
    })();
  }, []);

  if (inbounds.length)
    items.push({
      id: 'item1',
      content: {
        type: 'Inbound link',
        display: <span></span>,
      },
      hasChildren: true,
      children: inbounds.map(mapChildren.bind(this, 'inbound')),
    });

  if (outbounds.length)
    items.push({
      id: 'item2',
      content: {
        type: 'Outbound link',
        display: <span></span>,
      },
      hasChildren: true,
      children: outbounds.map(mapChildren.bind(this, 'outbound')),
    });

  return <TableTree
    columns={[LinkType, LinkDisplay]}
    headers={['Type', 'Docs Dependency']}
    columnWidths={['150px', '300px']}
    items={items}
  />;
};

export default InOutboundPage;