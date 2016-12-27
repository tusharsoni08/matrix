$(function() {
    $("#search").removeClass("loader");
    $("#search").prop("disabled", false);
    if (typeof(Storage) != "undefined") {
        if (localStorage.username === undefined) {
            var uname = prompt("Please enter Username", "");
            if(uname == null){
                localStorage.username = "Player"
            }else{
                localStorage.username = uname;
            }
        }
    } else {
        window.alert("Sorry! Your browser Not Support This Game :(\n Use Firefox, Chrome For Better Experience. ")
    }
    $(".openchat").on('click', function(event) {
        $('.ui.sidebar.right')
          .sidebar('toggle')
        ;
    });
    $(".rules").on('click', function(event) {
        $('.ui.sidebar.left')
          .sidebar('toggle')
        ;
    });
    var socket = io.connect(window.location.href);
    var username = localStorage.username;
    var playerName = "";
    var room;
    localStorage.check = "";
    localStorage.status = "free";
    socket.on('connect', function(){
        if(username != null){
            socket.emit('connect:client', {
                username: username
            });
        }
    });

    socket.on('join:server', function(data) {
        localStorage.room = data.room;
        room = localStorage.room;
        localStorage.status = data.status;
        $("#search").removeClass("loader");
        $("#search").prop("disabled", false );
        if(username == data.user1){
            //document.getElementById("me").innerHTML = username;
            //document.getElementById("vs").innerHTML = "vs";
            document.getElementById("you").innerHTML = data.user2;
            playerName = data.user2;
        }else if(username == data.user2){
            //document.getElementById("me").innerHTML = username;
            //document.getElementById("vs").innerHTML = "vs";
            document.getElementById("you").innerHTML = data.user1;
            playerName = data.user1;
        }
    });

    $(window).on('beforeunload', function(){
        if(room != null){
            socket.emit('close:client', {
                username: username,
                room: room
            });
            var check = ""
            localStorage.refresh = "refresh";
            var tmp = localStorage.check;
            check = tmp + localStorage.refresh;
            socket.emit('searchrefresh:client', {
                username: username,
                room: room,
                check: check
            });
            localStorage.check = "";
            //document.getElementById("me").innerHTML = "";
            //document.getElementById("vs").innerHTML = "";
            document.getElementById("you").innerHTML = "";
            playerName = "";
        }
        return 'are you sure you want to leave?';
    });

    socket.on('deleteData:server', function(data) {
        if((localStorage.status == "busy") && (localStorage.room == data.room)){
            //localStorage.room = undefined;
            localStorage.status = "free";
            document.getElementById("opponent").innerHTML = data.message;
            ResetTable();
        }
    });

    $("#search").on('click', function(event) {
        event.preventDefault();
        document.getElementById("opponent").innerHTML = "";
        $("#search").addClass("loader");
        $("#search").prop("disabled", true );
        if(localStorage.status == "busy"){
            ResetTable();
        }
        localStorage.check = "";
        localStorage.status = "free";
        var check = "";
        localStorage.search = "search";
        var tmp = localStorage.check;
        check = tmp + localStorage.search;
        localStorage.check = check;
        //document.getElementById("me").innerHTML = "";
        //document.getElementById("vs").innerHTML = "";
        document.getElementById("you").innerHTML = "";
        playerName = "";
        if(room != null){
            socket.emit('close:client', {
                username: username,
                room: room
            });
            socket.emit('join:client', {
                username: username
            });
        }else{
            socket.emit('join:client', {
                username: username
            });
        }
    });

    var mySet = new Set();
    var myHit = 0;
    var playerHit = 0;
    var totalHit = 0;
    $("td").click(function(event) {
        event.preventDefault();
        if(localStorage.status == "busy" ){
            var boxID = event.target.id;
            if(!mySet.has(boxID)){
                $(boxID).off('click');
                mySet.add(boxID);
                property = document.getElementById(boxID);
                property.style.backgroundColor = "#4885ed";
                myHit = myHit + 1;
                totalHit = mySet.size;
                socket.emit('game:client', {
                    room: room,
                    username: username,
                    boxID: boxID
                });
                if((totalHit == 49) && (myHit > playerHit)){
                    $('.win.small.modal')
                      .modal('show')
                    ;
                    socket.emit('result:client', {
                        result: "win",
                        room: room
                    });
                    var message = '<p>@' + username + ' VS @' + playerName + '</p>' + '<p>W!NNER: @' + username + '</p>' + '<p>LO$ER: @' + playerName + '</p>';
                    socket.emit('message:client', {
                        message: message,
                        username: "The MatriX Bot",
                        bot: "bot"
                    });
                    $("#messages").append('<div class="event"><div class="label"><img src="./images/bot.png"></div><div class="content"><div class="summary"><p id="username">' + 'The MatriX Bot' + '</p></div><div class="extra text">' + message + '</div></div></div>');
                    $(".chat").animate({ scrollTop: $(".chat")[0].scrollHeight }, "slow");
                }else if(totalHit == 49){
                    $('.lose.small.modal')
                      .modal('show')
                    ;
                    socket.emit('result:client', {
                        result: "lose",
                        room: room
                    });
                }
            }
        }
    });

    socket.on('game:server', function(data) {
        var id = data.boxID;
        mySet.add(id);
        var color = data.color;
        var prop = document.getElementById(id);
        prop.style.backgroundColor = "#db3236";
        playerHit = playerHit + 1;
    });

    socket.on('result:server', function(data) {
        if(data.result == "win"){
            $('.lose.small.modal')
              .modal('show')
            ;
        }else if(data.result == "lose"){
            $('.win.small.modal')
              .modal('show')
            ;
        }
    });

    socket.on('message:server', function(data) {
        if(data.bot != "bot"){
            $("#messages").append('<div class="event"><div class="label"><img src="./images/profile.png"></div><div class="content"><div class="summary"><p id="username">' + data.username + '</p></div><div class="extra text">' + data.message + '</div></div></div>');
            $(".chat").animate({ scrollTop: $(".chat")[0].scrollHeight }, "slow");
        }else{
            $("#messages").append('<div class="event"><div class="label"><img src="./images/bot.png"></div><div class="content"><div class="summary"><p id="username">' + data.username + '</p></div><div class="extra text">' + data.message + '</div></div></div>');
            $(".chat").animate({ scrollTop: $(".chat")[0].scrollHeight }, "slow");
        }

    });

    $("#message_form").on('submit', function(event) {
        event.preventDefault();
        var $input = $('[name="message"]');
        var message = $input.val();
        if(message){
            socket.emit('message:client', {
                message: message,
                username: username,
                bot: "none"
            });
            $("#messages").append('<div class="event"><div class="label"><img src="./images/profile.png"></div><div class="content"><div class="summary"><p id="username">' + username + '</p></div><div class="extra text">' + message + '</div></div></div>');
            $(".chat").animate({ scrollTop: $(".chat")[0].scrollHeight }, "slow");
            $('[name="message"]').val('');
        }
    });

    function ResetTable() {
        mySet.clear();
        myHit = 0;
        playerHit = 0;
        totalHit = 0;
        var tempid;
        for(i=1; i<8; i++){
            tempid = 'A' + i;
            $(tempid).on('click');
            var p1 = document.getElementById(tempid);
            p1.style.backgroundColor = "#ffffff";

            tempid = 'B' + i;
            $(tempid).on('click');
            var p2 = document.getElementById(tempid);
            p2.style.backgroundColor = "#ffffff";

            tempid = 'C' + i;
            $(tempid).on('click');
            var p3 = document.getElementById(tempid);
            p3.style.backgroundColor = "#ffffff";

            tempid = 'D' + i;
            $(tempid).on('click');
            var p4 = document.getElementById(tempid);
            p4.style.backgroundColor = "#ffffff";

            tempid = 'E' + i;
            $(tempid).on('click');
            var p5 = document.getElementById(tempid);
            p5.style.backgroundColor = "#ffffff";

            tempid = 'F' + i;
            $(tempid).on('click');
            var p6 = document.getElementById(tempid);
            p6.style.backgroundColor = "#ffffff";

            tempid = 'G' + i;
            $(tempid).on('click');
            var p7 = document.getElementById(tempid);
            p7.style.backgroundColor = "#ffffff";
        }
    }
});
