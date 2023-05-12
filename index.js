const exec = require('./src/exec')
const path = require('path')

const run = () => {
  // Install Dependencies
  {
    const { stdout, stderr } = exec('npm install && npm --loglevel error ci --only=prod', {
      cwd: path.resolve(__dirname),
    })
    console.log(stdout)
    if (stderr) {
      return Promise.reject(stderr)
    }
  }

  require('./src/index')()
}

run().catch(console.error)
