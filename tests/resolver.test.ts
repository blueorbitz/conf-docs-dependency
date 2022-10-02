import fetch from 'node-fetch';
import { expect } from 'chai'
import neo4j from 'neo4j-driver';
require('dotenv').config();

const INSTANCE_URL = 'https://captain-sage.atlassian.net';
const { FORGE_EMAIL, FORGE_API_TOKEN } = process.env;
const { NEO4J_CONNECTION, NEO4J_PASSWORD } = process.env;
const driver = neo4j.driver(NEO4J_CONNECTION, neo4j.auth.basic('neo4j', NEO4J_PASSWORD));

describe('setup tests', () => {
  it('checking default options', () => {
    const options = {
      detectRetina: false,
      fpsLimit: 30

    };
    expect(options.detectRetina).to.be.false;
    expect(options.fpsLimit).to.equal(30);
  });
});

describe('Extract confluence links', () => {
  const PropertyKey = 'conf_link_graph';

  const requestConfluence = async (path: string, options: any = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(FORGE_EMAIL + ":" + FORGE_API_TOKEN).toString('base64')
    };
    return await fetch(INSTANCE_URL + path, {
      headers, ...options
    });
  };

  const extractAndStoreLinks = async (page: any) => {
    const linksData = await extractPageLinks(page);
    // await updateConfluenceProperty(id); // Add this then confirm, or need a easier way to reset
    await storeLinksGraph(linksData, 'capsage');
  };

  const extractPageLinks = async (page: any) => {
    const pageResponse = await requestConfluence(`/wiki/rest/api/content/${page.id}?expand=body.storage,space`);

    const { body: { storage: { value: body } }, space } = await pageResponse.json();
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

      const cqlResponse = await requestConfluence(`/wiki/rest/api/content/search?cql=type=page AND space="${spaceKey}" AND title="${title}"&limit=1`);
      
      let id = "0";
      const { results } = await cqlResponse.json();
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

  const storeLinksGraph = async (linkData: any, prefix: string) => {
    const { space, page, links, confDocs, jira } = linkData;
    const session = driver.session({ database: 'neo4j' });
    try {
      const idConf = (id: string) => prefix + '_page_' + id;
      const idUrl = (s: string) => prefix + '_url_' + s.replace(/[^a-zA-Z]/g, "");
      const idJira = (key: string) => prefix + '_jira_' + key.replace('-', '_');

      let query = `MERGE (${idConf(page.id)}:PAGE { title: '${page.title}', space: '${space.key}', id: '${page.id}' })`;

      links.forEach(link => {
        query += `
          MERGE (${idUrl(link)}:EXTERNAL_URL { url: '${link}' })
          MERGE (${idConf(page.id)})-[:LINKS]->(${idUrl(link)})
        `;
      });

      confDocs.forEach(confDoc => {
        query += `
          MERGE (${idConf(confDoc.id)}:PAGE { title: '${confDoc.title}', space: '${confDoc.spaceKey}', id: '${confDoc.id}' })
          MERGE (${idConf(page.id)})-[:LINKS]->(${idConf(confDoc.id)})
        `;
      });

      jira.forEach(key => {
        query += `
          MERGE (${idJira(key)}:JIRA { issueKey: '${key}', instance: '${INSTANCE_URL}' })
          MERGE (${idConf(page.id)})-[:LINKS]->(${idJira(key)})
        `;
      });
      
      // console.log(query);
      // Write transactions allow the driver to handle retries and transient errors.
      const writeResult = await session.writeTransaction(tx =>
        tx.run(query)
      );

    } finally {
      await session.close();
    }
  };

  const updateConfluenceProperty = async (id: string) => {
    const propertyResponse = await requestConfluence(`/wiki/rest/api/content/${id}/property`);

    const { results: properties } = await propertyResponse.json();
    if (properties.find(o => o.key === PropertyKey))
      await requestConfluence(`/wiki/rest/api/content/${id}/property/${PropertyKey}`, {
        method: 'DELETE',
      });

    await requestConfluence(`/wiki/rest/api/content/${id}/property/${PropertyKey}`, {
      method: 'PUT',
      body: JSON.stringify({
        value: ["loaded"],
        version: {
          number: 1,
          minorEdit: true,
        }
      })
    });
  }

  it('request space', async () => {
    const res = await requestConfluence('/wiki/rest/api/space');
    const { results } = await res.json();

    for (const space of results) {
      if (space.type === 'personal') continue;

      const spaceResponse = await requestConfluence(`/wiki/rest/api/space/${space.key}/content?expand=metadata.properties&limit=99`);
      const { page: { results: pages = [] } } = await spaceResponse.json();

      for (const page of pages) {
        const { status, metadata: { properties: { _expandable: { [PropertyKey]: hasProperty } } } } = page;
        if (hasProperty != null && status !== 'current')
          continue;
        await extractAndStoreLinks(page);
      }
    }
  }).timeout(10000);
});
