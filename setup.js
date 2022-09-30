const fs = require('fs');
const Handlebars = require("handlebars");
require('dotenv').config();

(async function () {
  try {
    // Generate manifest.yml due to varying APP_ID from different user
    const content = fs.readFileSync('manifest-template.yml');
    const template = Handlebars.compile(content.toString());

    const { FORGE_APP_ID } = process.env;
    const templated = template({ FORGE_APP_ID });

    fs.writeFileSync('manifest.yml', templated);
  } catch (err) {
    console.error(err);
  }
})();