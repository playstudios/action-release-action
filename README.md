# Release Action

Release GitHub action with [semantic-release](https://github.com/semantic-release/semantic-release).

All assets built in the `dist` dir for branch `<branch>` are released in the branch `release/<branch>`.
Git tags `vx.x.x` and `vx` are also created for the default branch.

Preset used is `conventional-changelog-conventionalcommits`.

```yaml
name: Release
on:
  push:
    branches-ignore:
      - release/**

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 0
      - name: Build
        run: |
          echo ::group::install deps
          npm ci
          echo ::group::lint
          npm run lint
          echo ::group::test
          npm test
          echo ::group::pack
          npm run pack
      - uses: playstudios/action-release-action@v1
        with:
          github-token: ${{ github.token }}
```

To clean up obsolete release branches:

```yaml
name: Clean
on: delete

jobs:
  clean-release:
    runs-on: ubuntu-latest
    steps:
      - uses: playstudios/action-release-action@v1
        with:
          github-token: ${{ github.token }}
          clean: true
```
