var express = require('express');
var con = require('../config/db.js');
var currentTime = require('../config/tools.js');

var router = express.Router();

router.get('/', (req,res) => {
  if(req.isAuthenticated()){
    var user = req.user.user_id;
    var query = "SELECT ID,post_title,post_url,post_likes,post_comments FROM onedistin_posts WHERE timestamp < '"+currentTime.currentTime()+"' ORDER BY ID DESC LIMIT 2";
    con.query(query,function(err,result){
      if (err) throw err;
      result.forEach(function(item,index){
        con.query("SELECT * FROM onedistin_likes WHERE user=? AND postId=?",[user,item.ID], function(err,l_result){
          if(l_result.length > 0){
            item.liked = "1";
          }else{
            item.liked = "0";
          }

          if(index == result.length -1){
            res.render('forum', {posts: result})
          }
        });
      });
      ;
    });
  }else{
    var query = "SELECT ID,post_title,post_url,post_likes,post_comments FROM onedistin_posts WHERE timestamp < '"+currentTime.currentTime()+"' ORDER BY ID DESC";
    con.query(query,function(err,result){
      if (err) throw err;

      result.forEach(function(item,index){
            function findLongestWord(str) {
              const stringArray = str.split(" ");
              const orderedArray = stringArray.sort((a, b) => {
                return a.length < b.length;
              });
              return orderedArray;
            }
            var lng = findLongestWord(item.post_title);
              lng = lng[0];
            item.img_url = lng;
          if(index == result.length -1){
            res.render('forum', {posts: result})
          }
      });

    });
  }

});

router.get('/add',  isLoggedIn, (req,res) => {
  res.render('add');
});

router.post('/add', isLoggedIn, (req,res) => {
  var title = req.body.title;
  var body = req.body.body;
  var url = title.split(" ").join("-");

  var currentDate = currentTime.currentTime();

  var author = req.user.user_id;
  var query = "INSERT INTO onedistin_posts (ID,post_author,post_title,post_content,post_url,post_likes,post_comments,timestamp,time)VALUES(?,?,?,?,?,?,?,?,?)";
  con.query(query,[null,author,title,body,url,0,0,currentDate,new Date()], function(err){
    if(err)throw err;
    res.redirect('/forum');
  });
});

router.post('/comment', isLoggedIn, (req,res) => {
  var comment = req.body.comment;
  var post_id = req.body.postId;
  var author = req.user.user_id;
  var referer = req.headers.referer;
  var date = new Date();
  con.query("SELECT display_name FROM onedistin_users WHERE ID=?",[author],function(err,result){
    if(err) throw err;
    const author_name = result[0].display_name;
    var query = "INSERT INTO onedistin_comments (ID,comment_post_ID,comment_author,comment_author_name,comment_content,comment_parent,timestamp)VALUES(?,?,?,?,?,?,?);UPDATE onedistin_posts SET post_comments=(post_comments)+1 WHERE ID=?";
    con.query(query,[null,post_id,author,author_name,comment,0,date,post_id],function(err){
      if(err)throw err;
      res.redirect(referer);
    });
  });


});

router.get('/:title', (req,res) => {
  var url = req.params.title;
  if(req.isAuthenticated()){
    var user = req.user.user_id;
    var query = "SELECT * FROM onedistin_posts WHERE post_url= ?";
    con.query(query,[url],function(err,p_result){
      if (err)throw err;
      const postId = p_result[0].ID;
      con.query("SELECT * FROM onedistin_comments WHERE comment_post_ID=?;SELECT * FROM onedistin_likes WHERE user=? AND postId=?",[postId,user,postId],function(err,c_result){
        if(err)throw err;
        if(c_result[1].length > 0){
          var like = "1";
        }else{
          var like = "0";
        }
        //formatting time for post
        var n = p_result[0].time;
        var t = new Date(n);
        var months = ["Jan","Feb","Mar","April","May","June","July","Aug","Sep","Oct","Nov","Dec"];
        p_result[0].time = t.getHours()+":"+t.getMinutes()+" - "+t.getDate()+" "+months[t.getMonth()]+" "+t.getFullYear();
        //ends Here
        //formatting time for Comments
        c_result[0].forEach(function(item){
          var c = item.timestamp;
          var g = new Date(c);
          item.timestamp = g.getHours()+":"+g.getMinutes()+" - "+g.getDate()+" "+months[g.getMonth()]+" "+g.getFullYear();
        });
        //ends here
        res.render('post', {post: p_result[0], comment: c_result[0],like: like});
      });
    });
  }else{
    var query = "SELECT * FROM onedistin_posts WHERE post_url= ?";
    con.query(query,[url],function(err,p_result){
      if (err)throw err;
      const postId = p_result[0].ID;
      con.query("SELECT * FROM onedistin_comments WHERE comment_post_ID=?",[postId],function(err,c_result){
        if(err)throw err;
        //formatting time for post
        var n = p_result[0].time;
        var t = new Date(n);
        var months = ["Jan","Feb","Mar","April","May","June","July","Aug","Sep","Oct","Nov","Dec"];
        p_result[0].time = t.getHours()+":"+t.getMinutes()+" - "+t.getDate()+" "+months[t.getMonth()]+" "+t.getFullYear();
        //ends Here
        //formatting time for Comments
        c_result.forEach(function(item){
          var c = item.timestamp;
          var g = new Date(c);
          item.timestamp = g.getHours()+":"+g.getMinutes()+" - "+g.getDate()+" "+months[g.getMonth()]+" "+g.getFullYear();
        });
        //ends here
        res.render('post', {post: p_result[0], comment: c_result});
      });

    });
  }
});


function isLoggedIn(req,res,next){
  if (req.isAuthenticated())
  return next();

  res.redirect('/login');
}

module.exports = router;
