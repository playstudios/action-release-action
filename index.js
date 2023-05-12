const core = require('@actions/core')
const exec = require('./src/exec')
const path = require('path')

const run = async () => {
  // Install Dependencies
  {
    const { stdout, stderr } = await exec('npm install && npm --loglevel error ci --only=prod', {
      cwd: path.resolve(__dirname),
    })
    core.info(stdout)
    if (stderr) {
      return Promise.reject(stderr)
    }
  }

  require('./src/index')()
}

run().catch(core.setFailed)
