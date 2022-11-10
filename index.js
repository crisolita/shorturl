require('dotenv').config();
var {nanoid} = require('nanoid')
var bodyParser = require('body-parser')
const dns = require('node:dns');
var mongoose= require('mongoose')
const util = require("node:util");
const shortId = require('shortid');



const express = require('express');
const cors = require('cors');
const app = express();
const lookupPromisify= util.promisify(dns.lookup);
// Basic Configuration
const port = process.env.PORT || 3000;
mongoose.connect(process.env.MONGO_DB_URI, (err) => {
  if (err) {
    console.log(err);
  }
  console.log("Database connected successfully");
});
const urlSchema = new mongoose.Schema({
  original_url: {
    required: true,
    type: String,
    },
  short_url: {
    required: true,
    type: String
    }
});

const URL = mongoose.model("URL", urlSchema);
app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/shorturl', async function (req, res) {
  var tolook = req.body.url;
  if(!tolook.startsWith("https://") && !tolook.startsWith("http://")) {
     res.json({ error: "invalid url" })
      return
  } 
  if(tolook[tolook.length-1] === '/') {
    tolook=tolook.slice(0,-1)
  }
  try { 
    await lookupPromisify(tolook.replace(/https?:\/\//, ""))
    let findOne = await URL.findOne({
      original_url:tolook
    })
    if(findOne) {
      res.json({
        original_url: findOne.original_url,
        short_url: +findOne.short_url
      })
    } else {
      const [prev] = await URL.find().limit(1).sort({$natural:-1});
      let newURL= new URL({
        original_url:tolook,
        short_url:prev ? +prev.short_url + 1 : 1
      })
      await newURL.save();
      res.json({original_url:newURL.original_url,short_url:+newURL.short_url})
    }
  } catch(e) {
     return res.json({error: 'invalid Hostname'})
  }
})
// Your first API endpoint
app.get('/api/shorturl/:short', async function(req, res) {
  
 var data = await URL.findOne({short_url:req.params.short});
  if(!data) {
    return res.status(404).json('No URL found')
  } else {
    res.redirect(data.original_url)
  }
  
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

