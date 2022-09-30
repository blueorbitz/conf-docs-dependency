# Forge Hello World

This project contains a Forge app written in Javascript that displays `Hello World!` in a Confluence space page. 

See [developer.atlassian.com/platform/forge/](https://developer.atlassian.com/platform/forge) for documentation and tutorials explaining Forge.

## Requirements

See [Set up Forge](https://developer.atlassian.com/platform/forge/set-up-forge/) for instructions to get set up.

## Quick start

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

### Notes
- Use the `forge deploy` command when you want to persist code changes.
- Use the `forge install` command when you want to install the app on a new site.
- Once the app is installed on a site, the site picks up the new app changes you deploy without needing to rerun the install command.

## Support

See [Get help](https://developer.atlassian.com/platform/forge/get-help/) for how to get help and provide feedback.
