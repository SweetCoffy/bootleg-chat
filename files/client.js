var url = prompt(`Enter the server address below`, 'ws://ohno.ddns.net:8080')
var ws = new WebSocket(url)
var userList = {}
var u = document.querySelector('#connected-users')
var userId;
var msg = document.querySelector('.messages')
var tem = document.querySelector('#message-template')
var embedTem = document.querySelector('#embed-template')
var msgInput = document.querySelector('#message-input')
function addMessage(content, author, authorAvatar, system = false, embed) {
    var c = (`${tem.innerHTML.replace("{message}", content).replace("{author}", system ? `<underline><strong>${author}</strong></underline>` : author).replace("{avatar}", authorAvatar)}`)
    if (embed) {
        c += embedTem.innerHTML.replace("{title}", embed.title).replace("{description}", embed.description).replace("{footer}", embed.footer).replace("{color}", embed.color) + "<br>";
    }
    msg.innerHTML += c + "<br>";
    msg.scrollTo(0, msg.clientHeight * 69);
}
function sendMessage() {
    if (ws?.readyState == WebSocket.OPEN) {
        if (msgInput.value?.length > 0) {
            var o = { op: 4, data: { content: msgInput.value } }
            ws.send(JSON.stringify(o))
        }
        msgInput.value = ""
    } else systemMessage(`Cannot send message because the connection with the server existn't`, 'error')
}
var mInputForm = document.querySelector('#message-input-form')
mInputForm.onsubmit = () => sendMessage()
function systemMessage(content, type = 'info') {
    var types = {
        info: 'https://discord.com/assets/70fef31c956805f7f5d867ebb5ba9b70.svg',
        error: 'https://discord.com/assets/8becd37ab9d13cdfe37c08c496a9def3.svg',
        success: 'https://discord.com/assets/212e30e47232be03033a87dc58edaa95.svg'
    }
    addMessage(content, `System`, types[type] || `https://cdn.discordapp.com/emojis/755546914715336765.png?v=1`, true)
}
function kick(id) {
    var b = confirm(`Are you sure to kick ${userList[id]?.username || `ID${id}`}?`)
    if (b) {
        ws.send(JSON.stringify({ op: 7, data: { target: id } }))
    }
}
ws.onopen = ev => {
    systemMessage(`You've been connected to the server, you'll now be prompted to enter your username`)
    setTimeout(() => {
        var username;
        while (!username) {
            username = prompt(`Enter your username`) 
            if (!username) alert(`No`)
        }
        var avatar = prompt(`Enter your avatar URL (optional)`)
        var obj = { op: 0, data: {username, avatar} }
        ws.send(JSON.stringify(obj))
    }, 1000)
    setInterval(() => {
        ws.send(`{"op": 5, "data": {}}`)
    }, 7000)
}
ws.onclose = ev => {
    systemMessage(`Connection with the server has been closed, ${ev.code}: ${ev.reason}`, 'error')
}
var t = document.querySelector('#user-template')
ws.onmessage = ev => {
    try {
        var o = JSON.parse(ev.data)
        switch (o.op) {
            case 1:
                systemMessage(`${o.data.username} Has joined`, 'info')
                break;
            case 2:
                systemMessage(`User list retrieved`, 'success')
                userList = o.data;
                u.innerHTML = "";
                Object.values(userList).forEach(el => {
                    console.log(userList[userId]?.admin)
                    u.innerHTML += `${t.innerHTML.replace("{avatar}", el.avatar).replace("{user}", el.username || `ID${el.id}`)}${userList[userId]?.admin ? `<button onclick="kick('${el.id}')">Kick</button>` : ''}<br>`
                })
                break;
            case 3:
                addMessage(o.data.content, o.data.authorName, o.data.authorAvatar, false, o.data.embed)
                break;
            case 6:
                systemMessage(`${o.data.user.username || `ID${o.data.user.id}`} Has been kicked, ${o.data.code}: ${o.data.reason}`)
            case 8:
                userId = o.data.id;
                break;
            default:
                break;
        }
    } catch (e) {
        systemMessage(`There was an error while handling an incoming message`, 'error')
        console.log(e)
    }
}
ws.onerror = ev => {
    systemMessage(`There was an error while connecting to the server, reload the page an try again`, 'error')
}