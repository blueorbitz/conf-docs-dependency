import fetch from 'node-fetch';
import { expect } from 'chai'
require('dotenv').config();

const INSTANCE_URL = 'https://captain-sage.atlassian.net';
const { FORGE_EMAIL, FORGE_API_TOKEN } = process.env;

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

  const extractAndStoreLinks = async (id: string, page?: any) => {
    const pageResponse = await requestConfluence(`/wiki/rest/api/content/${id}?expand=body.storage`);
    const { body: { storage: { value: body } } } = await pageResponse.json();
    console.log('\n#########Body ', id, page.title);
    const foundLinks = [...body.matchAll(/href="(\S{7,})"/g)].map(o => o[1]);
    console.log(foundLinks);

    // Add this then confirm, or need a easier way to reset
    // await updateConfluenceProperty(id);
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
        const { metadata: { properties: { _expandable: { [PropertyKey]: hasProperty } } } } = page;
        if (hasProperty != null)
          continue;
        await extractAndStoreLinks(page.id, page);
      }
    }
  }).timeout(5000);
});