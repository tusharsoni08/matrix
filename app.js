
var fs = require('fs');
var express = require('express');
var app = express();
var server = app.listen(process.env.PORT || 3000);
var io = require('socket.io').listen(server);
var path = require('path')

app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);

// index.html
app.get('/', function(req, res) {
    fs.createReadStream('index.html').pipe(res);
});

var connectedUser = 0;
var searchUser = [];
var scoreList = {};
var count = 0;
var room = "room" + count;
var chatroom = "chatroom";
// sockets
io.sockets.on('connection', function(client){

    client.on('connect:client', function(data) {
        connectedUser = connectedUser + 1;
        client.join(chatroom);
        //console.log("connectedUser: " + connectedUser);
        var num = connectedUser;
        io.sockets.in(chatroom).emit('connect:server', {
            activeUser: num,
        });
    });

    client.on('join:client', function(data) {
        if(connectedUser >= searchUser.length){
            searchUser.push(data.username);
            client.join(room);
            //console.log("Search hit by: " + data.username + " for " + room);
            if(searchUser.length >= 2){
                var u1 = searchUser[0];
                var u2 = searchUser[1];
                if(u1 != u2){
                    searchUser.shift(); //remove first user
                    searchUser.shift(); //remove second user
                    //console.log(u1 + " and " + u2 + " connected");
                    io.sockets.in(room).emit('join:server', {
                        room: room,
                        status : "busy",
                        user1: u1,
                        user2: u2
                    });
                }else{
                    //console.log("ignore same user name and consider only one");
                    client.leave(data.room);
                    searchUser.shift();
                    searchUser.shift();
                }
                count = count + 1;
                room = "room" + count;
                //console.log(count);
            }
        }
    });

    client.on('searchrefresh:client', function(data) {
        //console.log("***searchrefresh*** user0: " + searchUser[0] + " & " + "user1: " + searchUser[1] + " check: " + data.check);
        if((data.check == "searchrefresh") && (data.username == searchUser[0])){
            searchUser.shift();
            client.leave(data.room);
            connectedUser = connectedUser - 1;
            //console.log(data.username + " has searchrefresh room: " + data.room);
        }
    });

    client.on('close:client', function(data) {
        //console.log(data.username + " trying to left room: " + data.room);
        //var message = data.username + " quit game";
        var message = "quit";
        io.sockets.in(data.room).emit('deleteData:server', {
            room: data.room,
            message: message
        });
        //console.log(data.username + " left=" + data.room);
        client.leave(data.room);
        count = count + 1;
    });

    client.on('game:client', function(data) {
        client.to(data.room).broadcast.emit('game:server', {
            username: data.username,
            boxID: data.boxID
        });
    });

    client.on('result:client', function(data) {
        client.to(data.room).broadcast.emit('result:server', {
            result: data.result
        });

        if(data.result == "win"){
            var size = Object.keys(scoreList).length;;
            var username = data.username;
            var score = data.score;

            if(username in scoreList){
                if(scoreList[username] <= score){
                    scoreList[username] = score;
                }
            }else{
                scoreList[username] = score;
            }

            var array=[];
            for(a in scoreList){
                array.push([a, scoreList[a]])
            }
            array.sort(function(a,b){return b[1] - a[1]});

            var sortedListLength = array.length;
            var rankData = "";
            var rank;

            if(sortedListLength > 10){

                for (var i = 0; i < 10; i++) {
                    rank = i+1;
                    rankData = rankData + "<p>Rank #" + rank + ". " + array[i][0] + " (" + array[i][1] + " Points)</p>";
                }

                rankData = "<p><u><b>Leaderboard</b></u> [TOP 10]</p>" + rankData;

            }else{

                for (var i = 0; i < sortedListLength; i++) {
                    rank = i+1;
                    rankData = rankData + "<p>Rank #" + rank + ". " + array[i][0] + " (" + array[i][1] + " Points)</p>";
                }

                rankData = "<p><u><b>Leaderboard</b></u></p>" + rankData;
            }
            

            io.sockets.in(chatroom).emit('scoreResult:server', {
                rankData: rankData
            });
        }
        
    });

    client.on('message:client', function(data) {
         client.to(chatroom).broadcast.emit('message:server', {
             message: data.message,
             username: data.username,
             bot: data.bot
         });
    });

    client.on('disconnect', function () {
        if (connectedUser) {
            --connectedUser;
            var num = connectedUser;
            io.sockets.in(chatroom).emit('connect:server', {
                activeUser: num,
            });
        }
    });

});
