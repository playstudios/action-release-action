import { execa } from 'execa'
import * as core from '@actions/core'
import * as github from '@actions/github'
import * as semanticRelease from 'semantic-release'

const shell = async (command) => execa(command, { shell: true, stdio: 'inherit' })

export default function releaseActionMain() {
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
  const octokit = github.getOctokit(core.getInput('repo-token'))
  const ref = await octokit.rest.git.getRef({ ...github.context.repo, ref: `heads/${branch}` }).catch((e) => e)

  core.info(`Ref data: ${ref.data ? JSON.stringify(ref.data) : 'No data'}`)

  if (ref.data) {
    core.info(`deleting release branch ${ref.data.ref}`)
    await octokit.rest.git.deleteRef({ ...github.context.repo, ref: `heads/${branch}` })
  } else if (ref.status === '404') {
    core.info('release branch of deleted branch not found')
  } else {
    core.info(`could not delete release branch ${branch}, got error: ${ref}`)
    throw ref
  }
}

const release = async () => {
  const branch = github.context.ref.replace(/^refs\/heads/, 'release')
  core.info(`current ref is ${branch}`)
  const assets = core.getInput('assets')
  if (['refs/heads/master', 'refs/heads/main'].includes(github.context.ref)) {
    await shell('git stash -u')
    await shell(`git checkout ${branch} || { git checkout -b ${branch} && git push -u origin ${branch}; }`)
    await shell(
      `git -c user.name='${semanticRelease.default.COMMIT_NAME}' -c user.email='${semanticRelease.default.COMMIT_EMAIL}' merge -`,
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
      tagFormat: core.getInput('tag-prefix') === 'v' ? 'v${version}' : `${core.getInput('tag-prefix')}\${version}`,
      plugins: [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        [
          '@semantic-release/github',
          {
            assets: assets ? assets.split(',').map((asset) => asset.trim()) : [],
          },
        ],
        '@semantic-release/changelog',
        [
          '@semantic-release/git',
          {
            assets: ['dist/**', 'CHANGELOG.md'],
          },
        ],
      ],
    }
    const modules = ['semantic-release', `conventional-changelog-${options.preset}`]
    try {
      await shell(`npm i ${modules.join(' ')}`)
    } catch (e) {
      core.warning(`attempted to install npm modules but failed, is this a js action?\n\n${e}`)
    }
    const result = await semanticRelease.default(options, {
      env: {
        ...process.env,
        GITHUB_TOKEN: core.getInput('repo-token'),
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
        `git -c user.name='${semanticRelease.default.COMMIT_NAME}' -c user.email='${semanticRelease.default.COMMIT_EMAIL}' commit -m 'chore(release): generate dist files'`,
      )
    } catch (e) {
      core.warning(`i've tried to commit something but it didn't work, is there actually anything to commit?\n\n ${e}`)
    }
    await shell(`git push -f origin HEAD:${branch}`)
  }
}
