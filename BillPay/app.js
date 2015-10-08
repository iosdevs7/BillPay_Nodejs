/**
 * @license
 * Licensed Materials - Property of IBM
 * 5725-I43 (C) Copyright IBM Corp. 2014, 2015. All Rights Reserved.
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 */

var express = require('express');
var bodyParser = require('body-parser');

//var passport = require('passport');
//var ImfBackendStrategy = require('passport-imf-token-validation').ImfBackendStrategy;
//var imf = require('imf-oauth-user-sdk');
var me = '2a138a23-62ce-4fcf-8b8b-dbed79d9afec-bluemix'; // Set this to your own account
//var password = process.env.cloudant_password
var password = '619141788ca83f6faa4791944df7691d486f5f2502107392656fdff5ad7d4576';
var cloudant = require('cloudant')({account:me, password:password});



//passport.use(new ImfBackendStrategy());

var app = express();
app.use(bodyParser.json());
//app.use(passport.initialize());

//redirect to mobile backend application doc page when accessing the root context
app.get('/', function(req, res){

  cloudant.db.list(function(err, all_dbs) {
  //res.send(all_dbs.join(','));
var billDb = cloudant.use('bills');
billDb.get('13a62d22f928299a7ada9e532204a4fd', { revs_info: true }, function(err, body){
  res.send(body);});
  });
  
});

app.get('/user/:id', function(req, res) {

  console.log("HI this is test");
  res.send('user' + req.params.id);    
});

app.get('/:id', function(req, res) {

var billDb = cloudant.use('bills');
if(req.params.id == 'bill')
  {
  billDb.get(req.params.id, { attachments: true }, function(err, body){

    var itemArray=body.items;
    var notPaidItems = new Array();
    for(i=0;i<itemArray.length;i++)
    {
      if(itemArray[i].paid == false)
      {
         notPaidItems.push(itemArray[i]); 
      }
    }
     var imageDic = body._attachments;
     var notPaidImages = new Array();
     for (i=0;i<notPaidItems.length;i++) {
       var billName = notPaidItems[i].imageName;
       notPaidImages.push(imageDic[billName]);
     };

     var dictionary = { 'bills' : notPaidItems, 'images' : notPaidImages};
    res.send(dictionary);});
  }
else if(req.params.id == 'accounts')
  { 
  billDb.get(req.params.id, { revs_info: true }, function(err, body){
  res.send(body.account);});
  }
else if(req.params.id == 'images')
  {
    billDb.get('bill', { attachments: true }, function(err, body){
  res.send(body._attachments);
  });
  }
});


//Updating a Document

app.get('/updateBill/:billno/:account', function(req, res) {

    var billDb = cloudant.use('bills');
     var billAmount = 0;
     billDb.get('bill', { revs_info: true }, function(err, billDoc){
      for (var i = billDoc.items.length - 1; i >= 0; i--) {
        if(billDoc.items[i].billno == req.params.billno){
          billDoc.items[i].paid = true;
          billAmount = billDoc.items[i].amount;

          break;
        }
      };
      billDb.insert(billDoc, 'bill', function(error1, billStatus){
        if(error1)
          res.send(error1);
        else
        {
          billDb.get('accounts', {revs_info: true }, function(err, accountDoc){
            var accountBalance;
            for (var i = accountDoc.account.length - 1; i >= 0; i--) {
              var accountNumber = accountDoc.account[i].accountNumber;
              var balance = accountDoc.account[i].balance;
              if(accountNumber == req.params.account){
                
                accountDoc.account[i].balance = balance - billAmount;

                break;
              }
            };
            billDb.insert(accountDoc, 'accounts', function(error2, accountStatus){
            if(error2)
              res.send(error2);
            else
              res.send(accountStatus);
          });
        });
      }
    });

  });
});

app.get('/updateAllBills/:sum/:account', function(req, res) {

    var billDb = cloudant.use('bills');
     var remainingBalance;
     billDb.get('bill', { revs_info: true }, function(err, body){
      for (var i = body.items.length - 1; i >= 0; i--) {
        
          body.items[i].paid = true;
      };

      billDb.insert(body, 'bill', function(err, response){
        if(err)
          res.send(err);
        else
        {
          billDb.get('accounts', {revs_info: true }, function(err, body){
            for (var i = body.account.length - 1; i >= 0; i--) {
              if(body.account[i].accountNumber == req.params.account){
              remainingBalance = body.account[i].balance - req.params.sum;
              body.account[i].balance = remainingBalance;
              }
            };
            billDb.insert(body, 'accounts', function(err, response){
            if(err)
              res.send(err);
            else
              res.send(remainingBalance);
          });
        });
      }
    });

  });
});

app.get('/defaultAccount/:accountno', function(req, res) {

    var billDb = cloudant.use('bills');
     
     billDb.get('accounts', { revs_info: true }, function(err, body){
      for (var i = body.account.length - 1; i >= 0; i--) {
        if (body.account[i].accountNumber == req.params.accountno)
          body.account[i].defaultAccount = true;
        else
          body.account[i].defaultAccount = false;
      };

      billDb.insert(body, 'accounts', function(err, response){
        if(err)
          res.send(err);
        else
          res.send(response);
      });
    });
});

//creatif(e a public st.accountno == atic content service
app.use("/public", express.static(__dirname + '/public'));

// create another static content service, and protect it with imf-backend-strategy
// app.use("/protected", passport.authenticate('imf-backend-strategy', {session: false }));
// app.use("/protected", express.static(__dirname + '/protected'));

//create a backend service endpoint
// app.get('/publicServices/generateToken', function(req, res){
// 		// use imf-oauth-user-sdk to get the authorization header, which can be used to access the protected resource/endpoint by imf-backend-strategy
// 		imf.getAuthorizationHeader().then(function(token) {
// 			res.send(200, token);
// 		}, function(err) {
// 			console.log(err);
// 		});
// 	}
// );

//create another backend service endpoint, and protect it with imf-backend-strategy
// app.get('/protectedServices/test', passport.authenticate('imf-backend-strategy', {session: false }),
// 		function(req, res){
// 			res.send(200, "Successfully access to protected backend endpoint.");
// 		}
// );

var port = (process.env.VCAP_APP_PORT || 3000);
app.listen(port);
console.log("mobile backend app is listening at " + port);
