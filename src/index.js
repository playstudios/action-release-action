const core = require('@actions/core')
const github = require('@actions/github')
const execa = require('execa')
const semanticRelease = require('semantic-release')

const shell = async (command) => execa.command(command, { shell: true, stdio: 'inherit' })

const run = async () => {
  try {
    if (core.getInput('clean')) {
      await clean()
    } else {
      await release()
    }
  } catch (e) {
    core.setFailed(e)
  }
}

const clean = async () => {
  core.info(`deleted ref: ${github.context.payload.ref}`)

  if (github.context.payload.ref_type !== 'branch') {
    core.info('deleted ref is not a branch, skipping')
    return
  }

  if (github.context.payload.ref.startsWith('release/')) {
    core.info('deleted ref is a release branch, skipping')
    return
  }

  const branch = `release/${github.context.payload.ref}`
  const octokit = github.getOctokit(core.getInput('github-token'))
  const ref = await octokit.git.getRef({ ...github.context.repo, ref: `heads/${branch}` }).catch((e) => e)

  if (ref.data) {
    core.info(`deleting release branch ${ref.data.ref}`)
    await octokit.git.deleteRef({ ...github.context.repo, ref: `heads/${branch}` })
  } else if (ref.status === '404') {
    core.info('release branch of deleted branch not found')
  } else {
    throw ref
  }
}

const release = async () => {
  const branch = github.context.ref.replace(/^refs\/heads/, 'release')

  await shell('git config user.name psa-builder')
  await shell('git config user.email admin-group@playstudios.asia')

  if (github.context.ref === 'refs/heads/master') {
    await shell('git stash -u')
    await shell(`git checkout ${branch} || { git checkout -b ${branch} && git push -u origin ${branch}; }`)
    await shell('git merge -')
    await shell('git checkout stash^3 .')
    const options = {
      branches: [branch],
      plugins: [
        [
          '@semantic-release/commit-analyzer',
          {
            preset: 'conventionalcommits',
          },
        ],
        [
          '@semantic-release/release-notes-generator',
          {
            preset: 'conventionalcommits',
          },
        ],
        '@semantic-release/github',
        '@semantic-release/changelog',
        [
          '@semantic-release/git',
          {
            assets: ['*/dist/**', 'CHANGELOG.md'],
          },
        ],
      ],
    }
    const modules = [
      'semantic-release',
      'conventional-changelog-conventionalcommits',
      ...options.plugins.map((x) => (typeof x === 'string' ? x : x[0])),
    ]
    await shell(`npm i ${modules.join(' ')}`)
    await semanticRelease(options, {
      env: {
        ...process.env,
        GITHUB_TOKEN: core.getInput('github-token'),
        GITHUB_REF: branch,
      },
    })
    await shell('git push -f origin HEAD:refs/tags/$(git describe --tags --exact-match --abbrev | cut -d. -f1)')
  } else {
    await shell('git add -A')
    await shell("git commit -m 'chore(release): generate dist files'")
    await shell(`git push -f origin HEAD:${branch}`)
  }
}

run()
