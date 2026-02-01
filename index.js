const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

// 路由：直接输出 HTML 界面
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>全球匿名聊天室</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: sans-serif; margin: 0; display: flex; height: 100vh; }
          #chat-side { flex: 2; display: flex; flex-direction: column; border-right: 1px solid #eee; }
          #settings-side { flex: 0.8; padding: 20px; background: #f9f9f9; }
          #messages { flex: 1; overflow-y: auto; padding: 20px; list-style: none; }
          .msg { margin-bottom: 15px; display: flex; align-items: flex-start; }
          .avatar { width: 40px; height: 40px; border-radius: 50%; margin-right: 10px; background: #ddd; object-fit: cover; }
          #input-area { padding: 20px; border-top: 1px solid #eee; display: flex; }
          input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
          button { padding: 10px 20px; background: #FF4B4B; color: white; border: none; border-radius: 4px; cursor: pointer; }
          .time { font-size: 10px; color: gray; margin-left: 5px; }
        </style>
      </head>
      <body>
        <div id="chat-side">
          <ul id="messages"></ul>
          <div id="input-area">
            <input id="m" autocomplete="off" placeholder="输入消息..." /><button onclick="send()">发送</button>
          </div>
        </div>
        <div id="settings-side">
          <h3>🛠️ 个人设置</h3>
          <p>昵称: <input id="nick" value="游客" style="width:100%" /></p>
          <p>名称颜色: <input type="color" id="clr" value="#FF4B4B" /></p>
          <p>头像地址: <input id="av_url" placeholder="图片URL" style="width:100%" /></p>
          <small>注：数据实时同步，刷新即清空</small>
        </div>

        <script src="/socket.io/socket.io.js"></script>
        <script>
          const socket = io();
          function send() {
            const input = document.getElementById('m');
            const data = {
              user: document.getElementById('nick').value,
              color: document.getElementById('clr').value,
              avatar: document.getElementById('av_url').value || 'https://www.gravatar.com/avatar/',
              text: input.value,
              time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            };
            socket.emit('chat message', data);
            input.value = '';
          }
          socket.on('chat message', (msg) => {
            const li = document.createElement('li');
            li.className = 'msg';
            li.innerHTML = \`<img class="avatar" src="\${msg.avatar}">
                           <div><b style="color:\${msg.color}">\${msg.user}</b> <span class="time">\${msg.time}</span><br>\${msg.text}</div>\`;
            document.getElementById('messages').appendChild(li);
            window.scrollTo(0, document.body.scrollHeight);
          });
        </script>
      </body>
    </html>
  `);
});

io.on('connection', (socket) => {
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Server is running');
});
