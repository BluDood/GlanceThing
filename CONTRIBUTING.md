# Contributing

Thank you for showing interest in contributing to GlanceThing! This document will lay out some of the policies, processes and expectations for contributing to the project.

## Code of Conduct

Please be respectful and constructive when interacting with others.

Harassment, personal attacks, or disrespectful behavior will not be tolerated.
Assume good intentions and focus discussions on improving the project.

## How To Contribute

0. Make a fork of the repository and clone it locally
1. Create a new branch:
   ```bash
   git checkout -b my-awesome-feature
   ```
2. Start making your changes
3. Make sure you run the following commands to verify the code builds, and to follow formatting and code style rules:

   ```bash
   # in the root of the repository
   npm run build
   npm run lint
   npm run format

   # in /client
   npm run build
   npm run lint
   ```

   Installing Prettier and ESLint in your IDE can help automate this!

4. Commit your changes (following [Conventional Commits](https://conventionalcommits.org))
5. Push your changes
6. Make a pull request (style explained below)

## Making Pull Requests

Pull requests should:

- Focus on one or few changes at a time (massive pull reqeusts will be denied)
- Clearly describe its changes

Pull request titles should also follow [Conventional Commits](https://conventionalcommits.org), e.g.:

```
fix: prevent crash when configuration for X is missing
```

## AI Policy

AI Tools (GitHub Copilot, Cursor, Claude, etc.) can be used for assistance when developing, but the human developer must understand and is responsible for the changes.

Using AI for research, suggestions, boilerplate/examples and autocompletion may be allowed.

Any AI used to make changes to the project must be disclosed in the pull request.

Automated changes and pull requests (e.g. OpenClaw) is disallowed.

Maintainers hold the right to close pull requests and deny changes that are suspected of using automated AI tools, or where the developer cannot explain what the changes contain.

## Maintainer Rights

The maintainer(s) holds the right to do the following:

- Request / push changes to a pull request before it is merged
- Reject pull requests that are low-quality, automated or do not align with the project's goals
- Close stale pull requests and issues

## Closing Thoughts

These guidelines help keep the project maintainable, and creates a sustainable environment for everyone looking to help the development of the project.

Thanks again for showing interest in helping the project!
