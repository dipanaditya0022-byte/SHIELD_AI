# 🛡️ ShieldAI — Content Safety Dashboard

> A production-grade, full-stack web dashboard for real-time content moderation using Microsoft Azure AI Content Safety. Built with a stunning modern UI, secure serverless backend, and enterprise-level features.

![Azure AI](https://img.shields.io/badge/Azure-Content%20Safety-0078D4?style=for-the-badge&logo=microsoft-azure&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

---

## ✨ Features

- 🔍 **Real-time Text Analysis** — Instant scanning using Azure AI Content Safety API
- 🖼️ **Image Analysis** — Upload images for visual content moderation
- 📦 **Batch Analysis** — Analyze multiple texts at once
- 📊 **Visual Risk Charts** — Animated bar charts per category
- 📜 **Session History** — Full history with type icons and timestamps
- ⬇ **Export JSON & PDF** — Download full safety reports
- 🌙 **Dark / Light Mode** — Persistent theme preference
- ⚡ **Connection Tester** — Verify Azure credentials instantly
- 🔐 **Secure Backend** — API key never exposed to browser
- 📱 **Fully Responsive** — Works on all screen sizes

---

## 🛠 Tech Stack

| Technology | Usage |
|---|---|
| HTML5 / CSS3 / JS | Pure frontend, zero frameworks |
| Microsoft Azure AI Content Safety | Text & Image analysis |
| Vercel Serverless Functions | Secure backend proxy |
| Vercel | Deployment & hosting |

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/shieldai.git
cd shieldai
```

### 2. Deploy to Vercel
```bash
npm i -g vercel
vercel
```

### 3. Add Environment Variables in Vercel
Go to **Vercel → Project → Settings → Environment Variables** and add:

```
AZURE_CONTENT_SAFETY_ENDPOINT = https://your-resource.cognitiveservices.azure.com
AZURE_CONTENT_SAFETY_KEY      = your_api_key_here
```

### 4. Redeploy
```bash
vercel --prod
```

---

## 📁 Project Structure

```
shieldai/
├── api/
│   ├── analyze.js     # Azure text & image analysis
│   └── test.js        # Connection tester
├── index.html         # Main dashboard
├── style.css          # All styles & themes
├── script.js          # Frontend logic
├── package.json       # ESM module config
├── vercel.json        # Vercel routing config
└── README.md
```

---

## 🔐 Security

API key is stored as a Vercel Environment Variable and never exposed to the browser. All Azure calls go through secure serverless functions.

---

## 👥 Team

| Person | Role |
|---|---|
| **Aditya Sharma** | Project Developer · [LinkedIn](https://www.linkedin.com/in/aditya-sharma-a42a68293/) · dipanaditya0022@gmail.com |
| **Abhimanyu Sharma Sir** | Project Mentor & Guide · [LinkedIn](https://www.linkedin.com/in/017abhimanyu/) |

---

## 🏫 Organizations

- **Chandigarh University** — Technical Innovation Partner
- **ByteXL** — Learning & Mentorship Platform
- **Microsoft Azure** — Cloud AI Infrastructure

---

<p align="center">Built with ❤️ by Aditya Sharma · Powered by Microsoft Azure AI</p>
