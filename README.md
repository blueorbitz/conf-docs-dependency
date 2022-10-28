# Forge Hello World

This project contains a Forge app written in Javascript that displays `Hello World!` in a Confluence space page. 

See [developer.atlassian.com/platform/forge/](https://developer.atlassian.com/platform/forge) for documentation and tutorials explaining Forge.

## Requirements

See [Set up Forge](https://developer.atlassian.com/platform/forge/set-up-forge/) for instructions to get set up.

## Quick start

#### If encounter Linter error. Likely is caused by `.gitignore`. Delete that file.

- Copy and rename `.env-sample` to `.env`. Fill in the value.

- Build a `manifest.yml`
```
npm run setup
```

- Modify your app by editing the files in `static/src/`.

- Build your app (inside of the `static/` directory):
```
npm install
npm run build
```

- Deploy your app by running:
```
forge deploy
```

- Install your app in an Atlassian site by running:
```
forge install
```

- Setup backend serverless neo4j-api
  + deploy to [vercel](https://vercel.com)
  + insert the environment variables `NEO4J_CONNECTION`, `NEO4J_PASSWORD`.

### Development
[Tunneling with Custom UI](https://developer.atlassian.com/platform/forge/tunneling/#tunneling-with-custom-ui)

- Run Forge Tunnel
```
forge tunnel
```

- Run Custom UI Hot-reloading
```
cd static/
npm run dev
```

- To build frontend outside of Confluence. [Setup Webtrigger](https://developer.atlassian.com/platform/forge/manifest-reference/modules/web-trigger/), [Reference Only](https://developer.atlassian.com/platform/forge/runtime-reference/web-trigger-api/).
- Copy and rename `.env-sample` to `.env` in static directory.
```
forge install list

// copy the Installation ID for the site and product you want the web trigger URL for.
forge webtrigger

// copy the link to env
```

- Setup NEO4J environment var
```
forge variables set VERCEL_NEO4J_SERVERLESS_URL value
```

### Notes
- Use the `forge deploy` command when you want to persist code changes.
- Use the `forge install` command when you want to install the app on a new site.
- Once the app is installed on a site, the site picks up the new app changes you deploy without needing to rerun the install command.

## Support

See [Get help](https://developer.atlassian.com/platform/forge/get-help/) for how to get help and provide feedback.

## Test

- [testing-forge](https://community.developer.atlassian.com/t/testing-forge-custom-ui-components-using-jest/50320/5)
```
npm run test
```

## Publishing
```
forge deploy -e production
```