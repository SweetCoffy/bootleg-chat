var users = {}
users["-1"] = {
    id: "-1",
    avatar: "https://discord.com/assets/a6d05968d7706183143518d96c9f066e.svg",
    username: "Server",
    admin: true,
    authenticated: true,
}
var http = require('http')
var ws = require('ws')
var fs = require('fs/promises')
var server = http.createServer(async (req, res) => {
    try {
        console.log(`Request: ${req.url}`)
        res.setHeader("Access-Control-Allow-Origin", "*")
        if (req.method.toUpperCase() == 'GET') {
            if (req.url.startsWith('/api/')) {
                res.setHeader('Content-Type', "text/json")
                return;
            }
            if (req.url == '/') {
                res.setHeader("Content-Type", "text/html")
                res.statusCode = 200;
                res.write(await fs.readFile(`files/index.html`, 'utf8'))
                res.end()
            } else {
                var p = `files${req.url}`
                var content = await fs.readFile(p, 'utf8')
                var parts = p.split('/')
                var f = parts[parts.length - 1].split('.')
                var format = f[f.length - 1]
                console.log(format)
                res.statusCode = 200;
                res.setHeader('Content-Type', `text/${format}`)
                res.write(content)
                res.end()
            }
        }
    } catch (er) {
        console.log(er)
        res.statusCode = 500;
        res.end(`No`);
    }
})

server.listen({ port: 8080 }, () => console.log(`HTTP server is running`))
var wss = new ws.Server({ server: server }, () => {
    console.log(`Websocket server is running`)
})
var r = (key, value) => { if (["pingTimeout", "authTimeout", "client"].includes(key)) {return null} else return value }
process.stdin.on('data', t => {
    for (var client of wss.clients) {
        if (client.readyState == ws.OPEN) client.send(JSON.stringify({ op: 3, data: { content: t + "", authorName: users["-1"].username, authorAvatar: users["-1"].avatar } }))
    }
})
wss.on('connection', (w, req) => {
    try {
        var id = (Date.now() - 1617425517925) + "";
        users[id] = {
            id: id,
            username: "",
            avatar: "",
            client: w,
            authTimeout: setTimeout(() => { w.close(4002, `Authentication timeout reached`) }, 60000),
            authenticated: false,
        }
        w.on('close', (code, reason) => {
            var o = JSON.stringify({ op: 6, data: { code, reason, user: users[id] } }, r)
            delete users[id]
            var j = JSON.stringify({ op: 2, data: users }, r);
            for (var client of wss.clients) {
                if (client.readyState == ws.OPEN) {client.send(j);client.send(o)}
            }
            
        })
        w.on('message', (d) => {
            try {
                var o = JSON.parse(d)
                console.log(o)
                switch (o.op) {
                    case 0:
                        var name = o.data.username;
                        var avatar = o.data.avatar;    
                        var admin = false;   
                        if (!name) return w.close(4001, `Invalid user name`);
                        users[id].username = name.split('@')[0];
                        if (name.split('@')[1] == 'supersecretpassword69') {
                            admin = true;
                            w.send(JSON.stringify({ op: 3, data: { content: `You're now an admin, this will allow you to kick other users with the "Kick" button below their names in the user list`, authorName: users["-1"].username, authorAvatar: users["-1"].avatar } }))
                        }
                        if (avatar) users[id].avatar = o.data.avatar;
                        users[id].authenticated = true;
                        users[id].admin = admin;
                        var j = JSON.stringify({ op: 1, data: users[id] }, r);
                        var u = JSON.stringify({ op: 2, data: users }, r)
                        for (var client of wss.clients) {
                            if (client.readyState == ws.OPEN) {client.send(j);client.send(u)}
                        }
                        w.send(JSON.stringify({ op: 8, data: { id: id } }), () => {
                            var l = JSON.stringify({ op: 2, data: users }, r)
                            w.send(l)
                        })
                        clearTimeout(users[id].authTimeout)
                        if (users[id].pingTimeout) clearTimeout(users[id].pingTimeout);
                        users[id].pingTimeout = setTimeout(() => { w.close(4000, `Ping timeout reached`) }, 20000);
                        break;
                    case 4:
                        if (!users[id].authenticated) return;
                        var m = JSON.stringify({ op: 3, data: { content: o.data.content, author: id, authorName: users[id].username, authorAvatar: users[id].avatar } }, r)
                        console.log(`${users[id].username}: ${o.data.content}`)
                        if (o.data.content.startsWith('/')) {
                            var regex = /"([^"]+?)"|([^ ]+)/g
                            var args = [...o.data.content.slice(1).matchAll(regex)].map(el => el[1] || el[2])
                            var cmd = args.shift()
                            for (var client of wss.clients) {
                                if (client.readyState == ws.OPEN) w.send(JSON.stringify({ op: 3, data: { content: `${users[id].username} Used /${cmd} with Server, and it did absolutely nothing at all!`, authorName: users["-1"].username, authorAvatar: users["-1"].avatar } }))
                            }
                            return;
                        }
                        for (var client of wss.clients) {
                            if (client.readyState == ws.OPEN) client.send(m)
                        }
                        break;
                    case 5:
                        if (users[id].pingTimeout) clearTimeout(users[id].pingTimeout);
                        users[id].pingTimeout = setTimeout(() => { w.close(4000, `Ping timeout reached`) }, 20000);
                        break;
                    case 7:
                        if (users[id].admin && o.data.target != id) {
                            users[o.data.target].client?.close?.(4004, `Kicked by ${users[id].username}`);
                        } else w.send(JSON.stringify({ op: 3, data: { content: `You don't have permissions to do that`, authorName: users["-1"].username, authorAvatar: users["-1"].avatar } }))
                        break;
                    default:
                        break;
                }
            } catch (er) {
                console.log(er)
            }
        })
    } catch (er) {
        console.log(er)
    }
})