const express = require('express')
const cors = require('cors')
const bp = require('body-parser')
const app = express();
const path = require('path')
const fs = require('fs')

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
    res.sendFile(path.join(process.cwd(), 'public', 'features.html'))
})


app.get('/news', (req, res) =>{
    var newsPage = fs.readFileSync('./public/news-header.html')
    const fileObjs = fs.readdirSync('./public/articles')

    const articleList = []

    fileObjs.forEach((file) =>
    {
        articleList.push(file)   
    })

    while (articleList.length > 0)
    {
        newsPage = newsPage + fs.readFileSync(path.join(process.cwd(), 'public', 'articles', articleList.pop()))
    }

    newsPage = newsPage + fs.readFileSync('./public/news-footer.html')
    res.send(newsPage)
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

    randomizer.stdout.on('data', (ipsBlob) => {
        res.send(JSON.stringify({"data": ipsBlob}))
    })

})

app.listen(port, () => {
    console.log(`Server listening on port ${port}!`)
})
