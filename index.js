import { resolve } from 'path'
import { exec } from "./src/exec.js"

const run = async () => {
  // Install Dependencies
  {
    const { stdout, stderr } = await exec('npm install && npm --loglevel error ci --only=prod', {
      cwd: resolve(__dirname),
    })
    console.log(stdout)
    if (stderr) {
      return Promise.reject(stderr)
    }
  }

  require('./src/index')()
}

run().catch(console.error)
