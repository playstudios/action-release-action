// import core from '@actions/core'
// import { execaCommand } from 'execa'
// import github from '@actions/github'
// import semanticRelease from 'semantic-release'
const core = require('@actions/core')
const github = require('@actions/github')
const execa = require('execa')
const semanticRelease = require('semantic-release')
//const { COMMIT_NAME, COMMIT_EMAIL } = require('semantic-release/lib/definitions/constants')

//const shell = async (command) => execaCommand(command, { shell: true, stdio: 'inherit' })
const shell = async (command) => execa.command(command, { shell: true, stdio: 'inherit' })

module.exports = () => {
  if (core.getInput('clean')) {
    clean()
  }
  core.debug('Initialization-successful')
  release().catch(core.setFailed)
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
  const ref = await octokit.rest.git.getRef({ ...github.context.repo, ref: `heads/${branch}` }).catch((e) => e)

  if (ref.data) {
    core.info(`deleting release branch ${ref.data.ref}`)
    await octokit.rest.git.deleteRef({ ...github.context.repo, ref: `heads/${branch}` })
  } else if (ref.status === '404') {
    core.info('release branch of deleted branch not found')
  } else {
    throw ref
  }
}

const release = async () => {
  const branch = github.context.ref.replace(/^refs\/heads/, 'release')
  core.info(`current ref is ${branch}`)

  if (['refs/heads/master', 'refs/heads/main'].includes(github.context.ref)) {
    await shell('git stash -u')
    await shell(`git checkout ${branch} || { git checkout -b ${branch} && git push -u origin ${branch}; }`)
    await shell(
      `git -c user.name='${semanticRelease.COMMIT_NAME}' -c user.email='${semanticRelease.COMMIT_EMAIL}' merge -`,
    )
    try {
      await shell('git checkout stash^3 .')
    } catch (err) {
      core.warning(`couldnt checkout anything, exiting\n\n${err}`)
    }
    const options = {
      branches: [branch],
      releaseRules: [{ type: 'build', scope: 'deps', release: 'patch' }],
      preset: 'conventionalcommits',
      tagFormat: core.getInput('tag-format') || 'v${version}',
      plugins: [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        '@semantic-release/github',
        '@semantic-release/changelog',
        [
          '@semantic-release/git',
          {
            assets: ['dist/**', 'CHANGELOG.md'],
          },
        ],
      ],
    }
    const modules = [
      'semantic-release',
      `conventional-changelog-${options.preset}`,
      ...options.plugins.map((x) => (typeof x === 'string' ? x : x[0])),
    ]
    try {
      await shell(`npm i ${modules.join(' ')}`)
    } catch (e) {
      core.warning(`attempted to install npm modules but failed, is this a js action?\n\n${e}`)
    }
    const result = await semanticRelease(options, {
      env: {
        ...process.env,
        GITHUB_TOKEN: core.getInput('github-token'),
        GITHUB_REF: branch,
      },
    })
    if (result) {
      await shell('git push -f origin HEAD:refs/tags/$(git describe --tags --exact-match --abbrev | cut -d. -f1)')
    }
  } else {
    await shell('git add -A')
    try {
      await shell(
        `git -c user.name='${semanticRelease.COMMIT_NAME}' -c user.email='${semanticRelease.COMMIT_EMAIL}' commit -m 'chore(release): generate dist files'`,
      )
    } catch (e) {
      core.warning(`i've tried to commit something but it didn't work, is there actually anything to commit?\n\n ${e}`)
    }
    await shell(`git push -f origin HEAD:${branch}`)
  }
}

run()
