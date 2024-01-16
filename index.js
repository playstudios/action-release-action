import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path'
import { exec } from "./src/exec.js"
import { releaseActionMain } from "./src/index.js"

const run = async () => {
  // Install Dependencies
  {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const { stdout, stderr } = await exec('npm install && npm --loglevel error ci --only=prod', {
      cwd: resolve(__dirname),
    })
    console.log(stdout)
    if (stderr) {
      return Promise.reject(stderr)
    }
  }

  releaseActionMain()
}

run().catch(console.error)
