# Contributing to BillBox

Thanks for your interest in contributing! This project is a React Native app, and contributions of all sizes — bug fixes, new platform parsers, docs, tests — are welcome.

## Getting set up

1. Fork the repo and clone your fork.
2. Follow the [Getting Started](README.md#getting-started) section in the README to install dependencies and run the app locally.
3. Create a branch for your change: `git checkout -b my-fix`.

## Making a change

- Keep pull requests focused — one fix or feature per PR is easier to review than a bundle of unrelated changes.
- Match the existing code style in the file you're editing.
- If you're adding support for a new platform (e.g. a food delivery or bank email format), check [`src/constants/platforms.js`](src/constants/platforms.js) and [`src/utils/`](src/utils/) for how existing platforms are parsed.
- Never commit secrets, API tokens, or `.env` files — use `.env.example` as a template.

## Submitting a pull request

1. Push your branch to your fork.
2. Open a pull request against `main` describing what changed and why.
3. Link any related issue.

## Reporting bugs / requesting features

Please open a [GitHub issue](https://github.com/rameshkr652/billbox/issues) with steps to reproduce (for bugs) or a clear description of the use case (for feature requests).
