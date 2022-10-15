import { expect } from 'chai';
import * as ResolveFunc from '../src/resolver';
require('dotenv').config();

describe('Example setup', () => {
  it('checking default options', () => {
    const options = {
      detectRetina: false,
      fpsLimit: 30

    };
    expect(options.detectRetina).to.be.false;
    expect(options.fpsLimit).to.equal(30);
  });
});

describe('Build connection graph', () => {
  it('Fetch and parse space information', async () => {
    const response = await ResolveFunc.getSpaces({});
    const results = response.results;
    expect(results).to.have.length;

    const space = results[0];
    expect(space).to.have.property('id');
    expect(space).to.have.property('key');
    expect(space).to.have.property('type');

    // TODO: check why this not exist? frontend calling `space.property.value`
    // expect(space).to.have.property('property');
  });

  it('Fetch page information');
  it('Extract links category');
  it('Build Neo4j Cyper');
  it('Update Confluence content property');
});
