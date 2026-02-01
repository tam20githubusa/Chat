const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>实时聊天室</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; display: flex; height: 100vh; color: #333; }
          #chat-side { flex: 2; display: flex; flex-direction: column; background: #fff; }
          #settings-side { flex: 0.8; padding: 25px; background: #f8f9fa; border-left: 1px solid #eee; overflow-y: auto; }
          
          #messages { flex: 1; overflow-y: auto; padding: 20px; margin: 0; list-style: none; background: #ffffff; }
          .msg { margin-bottom: 20px; display: flex; animation: fadeIn 0.3s; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
          
          .avatar { width: 45px; height: 45px; border-radius: 50%; margin-right: 12px; object-fit: cover; background: #eee; flex-shrink: 0; border: 1px solid #ddd; }
          .content-box { max-width: 80%; }
          .nick { font-weight: bold; font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; }
          .time { font-size: 11px; color: #999; margin-left: 8px; font-weight: normal; }
          .text-bubble { background: #f1f0f0; padding: 10px 14px; border-radius: 0 15px 15px 15px; display: inline-block; word-break: break-word; }
          .shared-img { max-width: 300px; border-radius: 10px; margin-top: 8px; cursor: pointer; border: 1px solid #eee; }

          #input-area { padding: 20px; background: #fff; border-top: 1px solid #eee; display: flex; gap: 10px; }
          input[type="text"] { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; outline: none; }
          button.send-btn { padding: 0 25px; background: #FF4B4B; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; }
          
          .setting-item { margin-bottom: 20px; }
          .setting-item label { display: block; font-size: 13px; color: #666; margin-bottom: 8px; }
          .file-input { font-size: 12px; }
          #preview-av { width: 60px; height: 60px; border-radius: 50%; display: block; margin-top: 10px; background: #eee; object-fit: cover; }
        </style>
      </head>
      <body>
        <div id="chat-side">
          <ul id="messages"></ul>
          <div id="input-area">
            <input id="m" autocomplete="off" placeholder="输入消息..." />
            <button class="send-btn" onclick="sendText()">发送</button>
          </div>
        </div>

        <div id="settings-side">
          <h2 style="margin-top:0">🛠️ 个人设置</h2>
          
          <div class="setting-item">
            <label>设置头像</label>
            <input type="file" class="file-input" accept="image/*" onchange="updateAvatar(this)" />
            <img id="preview-av" src="https://api.dicebear.com/7.x/bottts/svg?seed=Guest" />
          </div>

          <div class="setting-item">
            <label>昵称</label>
            <input type="text" id="nick" value="游客" style="width:90%" />
          </div>

          <div class="setting-item">
            <label>名称颜色</label>
            <input type="color" id="clr" value="#FF4B4B" style="width:100%; height:40px; border:none; cursor:pointer" />
          </div>

          <hr style="border:0; border-top:1px solid #eee; margin:30px 0;">
          
          <div class="setting-item">
            <label>📸 发送图片</label>
            <input type="file" accept="image/*" onchange="sendImage(this)" id="img-up" />
          </div>
        </div>

        <script src="/socket.io/socket.io.js"></script>
        <script>
          const socket = io();
          let currentAvatar = "https://api.dicebear.com/7.x/bottts/svg?seed=Guest";

          // 核心：图片压缩函数
          async function compress(file, maxWidth, maxHeight, quality) {
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  let width = img.width;
                  let height = img.height;
                  if (width > height) {
                    if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
                  } else {
                    if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
                  }
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(img, 0, 0, width, height);
                  resolve(canvas.toDataURL('image/jpeg', quality));
                };
              };
            });
          }

          // 更新个人头像
          async function updateAvatar(input) {
            if (input.files[0]) {
              currentAvatar = await compress(input.files[0], 100, 100, 0.7);
              document.getElementById('preview-av').src = currentAvatar;
            }
          }

          // 发送文本
          function sendText() {
            const input = document.getElementById('m');
            if(!input.value.trim()) return;
            emitMsg({ type: 'text', content: input.value });
            input.value = '';
          }

          // 发送图片
          async function sendImage(input) {
            if (input.files[0]) {
              const compressed = await compress(input.files[0], 800, 800, 0.6);
              emitMsg({ type: 'image', content: compressed });
              input.value = ''; // 重置input
            }
          }

          function emitMsg(payload) {
            socket.emit('chat message', {
              user: document.getElementById('nick').value,
              color: document.getElementById('clr').value,
              avatar: currentAvatar,
              type: payload.type,
              content: payload.content,
              time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            });
          }

          socket.on('chat message', (msg) => {
            const li = document.createElement('li');
            li.className = 'msg';
            const body = msg.type === 'text' 
              ? \`<div class="text-bubble">\${msg.content}</div>\`
              : \`<img src="\${msg.content}" class="shared-img" onclick="window.open(this.src)">\`;

            li.innerHTML = \`<img class="avatar" src="\${msg.avatar}">
                           <div class="content-box">
                             <div class="nick" style="color:\${msg.color}">\${msg.user} <span class="time">\${msg.time}</span></div>
                             \${body}
                           </div>\`;
            document.getElementById('messages').appendChild(li);
            const chatSide = document.getElementById('messages');
            chatSide.scrollTop = chatSide.scrollHeight;
          });

          // 回车发送
          document.getElementById('m').addEventListener('keypress', e => {
            if(e.key === 'Enter') sendText();
          });
        </script>
      </body>
    </html>
  `);
});

io.on('connection', (socket) => {
  socket.on('chat message', (msg) => { io.emit('chat message', msg); });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => { console.log('Running on port ' + PORT); });
