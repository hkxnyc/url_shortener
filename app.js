var mysql = require('mysql');
var express = require('express');
var device = require('express-device');
var bodyParser = require('body-parser');
var jade = require('jade');
var router = express.Router();
var app = express();


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended:true
}));
app.use(express.static(__dirname+'/site'));
app.use(device.capture());

app.set('views','./templates');
app.set('view engine','hbs');

// Closure
var generateSlug = (function(){
    var allowedChars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-";
    var length = 6;

    var rand = function(max,min){
      min = min || 0;
        return Math.floor(Math.random()*(max-min))+min
    };

    var genSlug = function(){
        var retStr = "";
        var strLen = allowedChars.length;
        for(var i = 0; i < length; i++){
            retStr += allowedChars[rand(strLen)];
        }
        return retStr;
    };

    return genSlug;
})();

var conn = mysql.createConnection({
    host : '127.0.0.1',
    user : 'root',
    password : 'root',
    database : 'urlShortener',
    port : 8889
});

conn.connect();

router.get('/',function(req,res){
    res.render(__dirname+'/templates/index.jade');
});

router.get('/l/:slug',function(req,res){
    var selectQuery = 'SELECT * FROM urls WHERE urls.slug = ?';
    conn.query(selectQuery,[req.params.slug],function(err,row,fields){
        if(err) console.log(err);
        //console.log(arguments);
        if(row[0].target_device == "Mobile"){
            //https://www.npmjs.com/package/express-device 
            if(req.device.type != "phone"){
                res.status(404);
                return res.end();
            }
        }
        else if(row[0].target_device == "Tablet"){
            if(req.device.type != "tablet"){
                res.status(404);
                return res.end();
            }
        }
        else if(row[0].target_device == "Handheld"){
            if(req.device.type != "phone" && req.device.type != "tablet"){
                res.status(404);
                return res.end();
            }
        }
        else if(row[0].target_device == 'Desktop'){
            if(req.device.type != 'desktop'){
                res.status(404);
                return res.end();
            }
        }
        res.redirect(row[0].original_url);
        conn.query('UPDATE urls SET redirects = redirects+1 WHERE slug = ?',[req.params.slug]);
    });
});

router.post('/',function(req,res){
    var slug = generateSlug();
    var query = 'INSERT INTO urls(original_url,slug,target_device,created_at,updated_at) VALUES (?, ?, ?, now(), now()) ';
    conn.query(query,[req.body.url,slug,req.body.device],function(err,row,fields){
       if(err) throw err;
        res.render(__dirname+'/templates/index.jade',{msg:'Url: '+req.body.url+' shortened to localhost:3000/l/'+slug});
        res.end();
    });
});

router.get('/list',function(req,res){
   conn.query('SELECT * FROM urls WHERE 1',function(err,rows,fields){
       if(err) throw err;
       res.render(__dirname+'/templates/listurls.jade',{urls : rows});
       res.end();
   })
});

app.use('/',router);

app.listen(3000,function(){
   console.log("Running server!")
});