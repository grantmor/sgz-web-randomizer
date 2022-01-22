const express = require('express')
const cors = require('cors')
const bp = require('body-parser')
const app = express();
const path = require('path')

const port = process.env.port || 3000;

/* Middleware */
app.use(cors())
app.use(bp.json())

/* Routes */
const expStaticOptions = {
    dotfiles: "ignore",
    etag:true,
    extensions: ['htm', 'html', 'css'],
    index: false,
    maxAge: '7d',
    redirect: false
}

app.use(express.static("public", expStaticOptions))


app.get('/', (req, res) => {
    res.sendFile(path.join('./', 'public', 'features.html'))
})


app.post('/randomize', (req, res) => {
    console.log(req.body)
    options = req.body

    const randomizerPath = './sgz-tools/randomizerCli.py'

    /* Randomizer on server should only output to stdout
    instead of creating an ips file */
    args = [randomizerPath, 'out=stdout'] 

    for (const key in options) {
        args.push((key) + '=' + options[key])
    }

    // Call Randomizer
    const { spawn } = require('child_process')
    const randomizer = spawn('python3', args)

    randomizer.stdout.on('data', function(ipsBlob) {
        res.send(JSON.stringify({"data": ipsBlob}))
    })

})

app.listen(port, () => {
    console.log(`Server listening on port ${port}!`)
})
