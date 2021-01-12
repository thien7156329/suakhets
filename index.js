var express = require('express');
var app = express();
var _findIndex = require('lodash/findIndex') // npm install lodash --save
var server = require('http').Server(app);
var port = (process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 6969);
var io = require('socket.io')(server);
var fs = require('fs');
var cors = require('cors')
var bodyParser = require('body-parser')
const axios = require('axios');

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
server.listen(port, () => console.log('Server running in port ' + port));

var userOnline = []; //danh sách user dang online
app.options('*', cors()) // include before other routes

app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});

io.on('connection', function(socket) {
    console.log(socket.id + ': connected');
    //lắng nghe khi người dùng thoát
    socket.on('disconnect', function() {
        console.log(socket.id + ': disconnected')
        $index = _findIndex(userOnline, ['id', socket.id]);
        userOnline.splice($index, 1);
        io.sockets.emit('updateUesrList', userOnline);
    })
    //lắng nghe khi có người gửi tin nhắn
    socket.on('newMessage', data => {
        //gửi lại tin nhắn cho tất cả các user dang online
        io.sockets.emit('newMessage', {
            id: data.id,
            message: data.message,
            user: data.user,
            url: data.url
        });
    })
    socket.on('listen', data => {
        //gửi lại tin nhắn cho tất cả các user dang online
        io.sockets.emit('listen', {
            id: data.id,
            message: data.message,
            user: data.user
        });
    })
    socket.on('typing', data => {
        //gửi lại tin nhắn cho tất cả các user dang online
        io.sockets.emit('typing', {
            user: data.user
        });
    })
    //lắng nghe khi có người login
    socket.on('login', data => {
        // kiểm tra xem tên đã tồn tại hay chưa
        if (userOnline.indexOf(data) >= 0) {
            socket.emit('loginFail'); //nếu tồn tại rồi thì gửi socket fail
        } else {
            // nếu chưa tồn tại thì gửi socket login thành công
            socket.emit('loginSuccess', data);
            userOnline.push({
                id: socket.id,
                name: data
            })
            io.sockets.emit('updateUesrList', userOnline);// gửi danh sách user dang online
        }
    })

});

var corsOptions = {
    origin: 'localhost:3000',
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

app.get('/', (req, res) => {
    console.log('123')
    // res.send("Home page. Server running okay.");
})

app.post('/write', (req, res) => {
    let data = req.body
    fs.readFile('clientchat.txt', 'utf8', function(err, dataRead) {
        let object = dataRead && JSON.parse(dataRead) || []
        object.push(data)
        fs.writeFile('clientchat.txt',  JSON.stringify(object) , function (err) {
            if (err) throw err;
        });
    });
})

app.get('/read', (req, res) => {
    fs.readFile('clientchat.txt', 'utf8', function(err, data) {
        return res.json(data)
    });
})

app.post('/writeScore', (req, res) => {
    let data = req.body
    axios.get('http://thienstyle.atwebpages.com/high_score.txt')
    .then(dataRead => {
        let object = dataRead && JSON.parse(JSON.stringify(dataRead.data))
        object = object.sort((a, b) => a.score - b.score)
        console.log(object, "object")
        if(parseInt(data.score) > parseInt(object[0].score)){
            object[0].userName = data.userName
            object[0].score = data.score
            object[0].url = data.url
            // object[0].userName = "Trùm"
            // object[0].score = 22
            // object[0].url = "url"
            axios.post('http://thienstyle.atwebpages.com/highscore.php', {
                headers: {"Access-Control-Allow-Origin": "*"},
                body: JSON.stringify(object)
            })
            .then(function (response) {
                return res.send("oke.");
            })
            .catch(function (error) {
                console.log(error);
            });
        }
        else {
            return res.send("Done.");
        }
    })
    .catch(error => {
        console.log(error);
    });
    // fs.readFile('high_score.txt', 'utf8', function(err, dataRead) {
    //     let object = dataRead && JSON.parse(dataRead) || []
    //     object = object.sort((a, b) => a.score - b.score)
    //     if(object.length > 4){
    //         if(parseInt(data.score) > parseInt(object[0].score)){
    //             object[0].userName = data.userName
    //             object[0].score = data.score
    //             object[0].url = data.url
    //             fs.writeFile('high_score.txt', JSON.stringify(object) , function (err) {
    //                 if (err) throw err;
    //             });
    //         }
    //         else {
    //             return
    //         }
    //     }else{
    //         object.push(data)
    //         fs.writeFile('high_score.txt', JSON.stringify(object) , function (err) {
    //             if (err) throw err;
    //         });
    //     }
    // });
})

app.get('/readScore', (req, res) => {
    axios.get('http://thienstyle.atwebpages.com/high_score.txt')
    .then(data => {
        let objectScore = data && JSON.parse(JSON.stringify(data.data)) || []
        objectScore = objectScore.sort((a, b) => b.score - a.score)
        return res.json(JSON.stringify(objectScore))
    })
    .catch(error => {
        console.log(error);
    });

    // fs.readFile('high_score.txt', 'utf8', function(err, data) {
    //     let objectScore = data && JSON.parse(data) || []
    //     objectScore = objectScore.sort((a, b) => b.score - a.score)
    //     return res.json(JSON.stringify(objectScore))
    // });
})


