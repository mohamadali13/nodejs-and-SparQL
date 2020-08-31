function connectSocket() {
    // to not stack our eventlisteners we unbind everything on
    // load of this function
    $(document).unbind();

    var socket = new WebSocket("ws://localhost:3000");

    socket.onopen = function () {
        var username = $('#name').val();
        connectUser(username, socket);
    }

    socket.onmessage = function (msg) {
        console.log(msg);
        message(msg.data);
    }

    $('#disconnectButton').click(function() {
        console.log("clicked disco button");
        socket.close();
        message(socket.readyState);
        message("connection closed");
        console.log(socket.readyState);
    });
    $('#message').keypress(function(event) {
        if (event.keyCode == '13') {
            send();
        }
    });

    $('getMessages').click(function() {
        socket.send();
    });

    function send() {
        var input = {
            "sender" : $('#name').val(),
            "recipient" : $('#recipient').val(),
            "message" : $('#message').val()
        }
        console.log(input);
        console.log(socket);
        socket.send(JSON.stringify(input));
        message('SENDED: ' + input.message + " / TO: " + input.recipient);
    }
}

// our message function to append a message to our LOG
function message(msg) {
    if (msg.startsWith("History:")) {
        $('#history').empty();
        $('#history').append(msg+'</br>');
    } else {
        $('#log').append(msg+'</br>');
    }
}

function connectUser(username, socket) {
    message('Trying to connect as User: '+username);
    var userJson = {
        "name": username
    }
    socket.send(JSON.stringify(userJson));
}