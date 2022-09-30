const resolver = require('../src/resolver');

test('adds 1 + 2 to equal 3', () => {
  expect(resolver.getText({})).toBe('Hello, world!');
});