# 🍼 Commit Formatter Bot

![Bot Face](./DISCORD-BOT.avif)

A tiny helper bot that lives in your Discord server and makes commit messages adorable 🧸  
It listens to whatever you type and replies with a cute little formatted update 💬✨

---

## 💡 What It Does

When someone types something like:

```
readme
```

It replies with:

```
✅ [Bryen] added a [readme]
```

---

## ⚙️ How to Use

1. Install dependencies  
   `npm install`

2. Create a `.env` file with your token  
   `DISCORD_TOKEN=your_token_here`

3. Start the bot  
   `npm start`

---

## 🌐 Render Setup

Build command:  
`npm run render-build`

Start command:  
`npm start`

Your `package.json` should include:

"scripts": {  
  "start": "node index.js",  
  "build": "echo 'no build step needed'",  
  "render-build": "npm install && npm run build"  
}

---

Made with ❤️ by **BryGuy**
