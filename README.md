# 🎓 NoteVerse

> **Transform Learning with AI-Powered Intelligence**

NoteVerse is a modern, feature-rich educational platform that empowers both students and teachers with AI-driven tools for smarter learning. From intelligent note summaries to real-time quiz generation, NoteVerse revolutionizes how educational content is created, shared, and learned.

![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2.3-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwind-css)
![Firebase](https://img.shields.io/badge/Firebase-12.9.0-orange?logo=firebase)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

### 🤖 **AI Chat & Summaries**
- Ask intelligent questions about your notes
- Upload PDFs or text content for instant analysis
- Powered by Google Gemini AI for accurate, context-aware responses
- Get comprehensive summaries in seconds

### 📝 **Quiz Architect**
- Teachers can auto-generate multiple-choice quizzes from any notes
- Push quizzes live to students in real-time
- Streamline assessment creation and distribution
- Customizable difficulty levels and question formats

### 📇 **Interactive Flashcards**
- Create and organize flashcards for efficient studying
- AI-powered card generation from notes
- Spaced repetition support for optimal learning
- Track learning progress and mastery levels

### 👥 **Classroom Hub**
- Dedicated classroom management for teachers
- Real-time student collaboration features
- Organize resources and assignments
- Monitor student progress and engagement

### 📚 **Multi-Format Support**
- Support for text notes and PDF documents
- Extract and process information from various file formats
- Preserve formatting and structure during processing

### 🎨 **Modern UI/UX**
- Beautiful dark and light theme support
- Responsive design for desktop and mobile
- Smooth animations with Framer Motion
- Intuitive navigation and interface

### 🔐 **Secure Authentication**
- Firebase authentication integration
- Secure user sessions and data protection
- Role-based access control (Students/Teachers)

### ☁️ **Cloud Storage**
- Vercel Blob integration for reliable file storage
- Secure document handling and retrieval

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18.17 or later
- npm, yarn, pnpm, or bun package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/abb4s08/NoteVerse.git
   cd NoteVerse
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory with your Firebase and Gemini API credentials:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   NEXT_PUBLIC_VERCEL_BLOB_TOKEN=your_blob_token
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

---

## 📦 Tech Stack

### Frontend
- **Next.js 16.1.6** - React framework with server-side rendering
- **React 19.2.3** - UI library
- **TypeScript 5** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first CSS framework
- **Framer Motion 12.34.3** - Animation library

### Backend & Services
- **Firebase 12.9.0** - Authentication, Firestore database, and storage
- **Google Generative AI 0.24.1** - AI-powered chat and summaries
- **Vercel Blob 2.3.0** - Cloud file storage

### Development
- **ESLint 9** - Code linting
- **Node Types & React Types** - TypeScript definitions

### Utilities
- **pdf-parse 2.4.5** - PDF parsing
- **react-markdown 10.1.0** - Markdown rendering
- **remark-gfm 4.0.1** - GitHub-flavored markdown support
- **lucide-react 0.575.0** - Icon library
- **clsx 2.1.1** - Conditional className helper
- **tailwind-merge 3.5.0** - Tailwind CSS merge utility

---

## 📁 Project Structure

```
NoteVerse/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Dashboard pages
│   │   └── page.tsx           # Landing page
│   ├── components/
│   │   ├── landing/           # Landing page components
│   │   ├── dashboard/         # Dashboard components
│   │   └── ui/                # Reusable UI components
│   ├── contexts/              # React contexts (Auth, etc.)
│   ├── lib/
│   │   ├── firebase.ts        # Firebase configuration
│   │   ├── gemini.ts          # Gemini AI integration
│   │   ├── notifications.ts   # Notification utilities
│   │   └── utils.ts           # Helper functions
│   └── app.css                # Global styles
├── public/                     # Static assets
├── firebase.json              # Firebase configuration
├── package.json               # Dependencies and scripts
└── tsconfig.json              # TypeScript configuration
```

---

## 🛠️ Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint
```

---

## 🔧 Configuration

### Firebase Setup
1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Set up Cloud Storage
5. Copy your credentials to `.env.local`

### Gemini API
1. Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Add it to your `.env.local` file

### Vercel Blob
1. Set up Vercel Blob storage on your Vercel project
2. Add the token to your environment variables

---

## 🎯 Key Features in Detail

### For Students
- ✅ Upload notes or PDFs for AI-powered analysis
- ✅ Get instant summaries and answers to questions
- ✅ Create and practice with interactive flashcards
- ✅ Take quizzes from teachers
- ✅ Track learning progress

### For Teachers
- ✅ Create and manage classes
- ✅ Generate quizzes automatically from course materials
- ✅ Distribute content and assignments in real-time
- ✅ Monitor student engagement and performance
- ✅ Create interactive learning resources

---

## 🚀 Deployment

### Deploy on Vercel (Recommended)

The easiest way to deploy NoteVerse is with [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your NoteVerse repository
4. Add your environment variables in the Vercel dashboard
5. Deploy with one click

For more details, see [Next.js Deployment Documentation](https://nextjs.org/docs/app/deploying)

---

## 🤝 Contributing

We welcome contributions! To contribute to NoteVerse:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Guidelines
- Follow TypeScript best practices
- Use ESLint for code quality (`npm run lint`)
- Write meaningful commit messages
- Keep the code modular and well-documented

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Firebase](https://firebase.google.com/) - Backend and authentication
- [Google Generative AI](https://ai.google.dev/) - AI capabilities
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Framer Motion](https://www.framer.com/motion/) - Animations

---

## 📞 Support & Feedback

Have questions or suggestions? We'd love to hear from you!

- 🐛 **Report bugs** via [GitHub Issues](https://github.com/abb4s08/NoteVerse/issues)
- 💡 **Suggest features** on the [Discussions](https://github.com/abb4s08/NoteVerse/discussions) tab
- 📧 **Email support** - Check repository for contact information

---

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced collaboration features
- [ ] AI-powered personalized learning paths
- [ ] Integration with LMS platforms
- [ ] Offline mode support
- [ ] Video content support

---

**Made with ❤️ by the NoteVerse Team**

⭐ If you find this project helpful, please consider giving it a star!
