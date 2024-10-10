# Release Action

Release GitHub action with [semantic-release](https://github.com/semantic-release/semantic-release).

All assets built in the `dist` dir for branch `<branch>` are released in the branch `release/<branch>`.
Git tags `vx.x.x` and `vx` are also created for the default branch.

Preset used is `conventional-changelog-conventionalcommits`.

## Tag version format

> [!WARNING]
> Do no mix'n'match tag formats within a single repo!
>
> If the latest release in a repo is `3.2.0` and you change the format to prefix the numbers with a `v` then the next release will be `v1.0.0`.
> i.e. There will be a parallel release channel... maybe this is what you want?
>
> More information can be found [here](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#existing-version-tags)

An optional `tag-prefix` input can be provided to control the format of the tag created.

More information can be found [here](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#tagformat)

The following example will create a release in the format `X.Y.Z`
```
      - uses: playstudios/action-release-action@v1
        with:
          repo-token: ${{ github.token }}
          tag-prefix: ''
```

The following example will create a release in the format `mysuperrelease-X.Y.Z`
```
      - uses: playstudios/action-release-action@v1
        with:
          repo-token: ${{ github.token }}
          tag-prefix: 'mysuperrelease-'
```

If `tag-prefix` is not included, the release format is `vX.Y.Z`

### Full example using default tag format

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
      - uses: actions/checkout@v3
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
          repo-token: ${{ github.token }}
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
          repo-token: ${{ github.token }}
          clean: true
```
## Include Assets to Release
Input require to include assets to release, using `assets` that accept string with the list files and folders, see example below.

> [!Note]
> The assets can be a Glob or and Array of globs and Objects,
> more information about assets bundle with github release can be found [here](https://github.com/semantic-release/github#assets)
### The following example will create release with assets Binary files
```
name: Release
on:
  push:
    branches-ignore:
      - release/**

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - name: Build
        # env: 
        #   INPUT_DOCKERPASSWORD: ${{ secrets.DOCKER_PASSWORD }}
        #   REPO_TOKEN: ${{ secrets.REPO_TOKEN }}
        run: |
          echo "foo binary" >> foo.exe
          echo "bar binary" >> bar.exe
      - uses: playstudios/action-release-action@release/henry/do-1636
        with:
          repo-token: ${{ github.token }}
          tag-prefix: ''
          tag-format: ''
          assets: 'binary.exe, bar.exe'
```