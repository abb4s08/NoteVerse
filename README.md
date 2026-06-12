# NoteVerse

An intelligent note-taking application powered by AI, built with Next.js and Google Generative AI. NoteVerse combines seamless note management with advanced AI capabilities, including PDF parsing, intelligent chat, and automatic note generation.

## 🚀 Features

- **AI-Powered Notes**: Generate, summarize, and enhance your notes with Google's Gemini AI
- **PDF Support**: Parse and extract text from PDF files for easy note creation
- **Intelligent Chat**: Ask questions about your notes with an AI-powered chat interface
- **Real-time Markdown**: Write and format notes using Markdown with live preview
- **Firebase Integration**: Secure cloud storage and authentication
- **Beautiful UI**: Modern, responsive interface with smooth animations using Framer Motion
- **Dark Mode Ready**: Cosmic-themed design with Tailwind CSS

## 🛠️ Technology Stack

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org) - React 19
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com) with custom PostCSS
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Markdown**: [React Markdown](https://github.com/remarkjs/react-markdown) with GitHub-flavored markdown support

### Backend & Services
- **API Framework**: Next.js API Routes
- **AI Engine**: [Google Generative AI (Gemini)](https://ai.google.dev/)
- **PDF Parsing**: [pdf-parse](https://github.com/modeso/pdf-parse)
- **Database**: [Firebase Realtime Database](https://firebase.google.com)
- **Authentication**: Firebase Authentication

### Development Tools
- **Language**: TypeScript 5
- **Linting**: ESLint 9
- **Package Manager**: npm

## 📋 Prerequisites

- Node.js 16+ and npm
- Firebase project and credentials
- Google Generative AI API key

## 🚀 Getting Started

### Installation

1. Clone the repository:
```bash
git clone https://github.com/abb4s08/NoteVerse.git
cd NoteVerse
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory and add your credentials:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_firebase_database_url
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key
```

### Development Server

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

The app will auto-reload as you make changes to the code.

## 📦 Available Scripts

- `npm run dev` - Start the development server with hot reload
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint to check code quality

## 📁 Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes for AI services
│   │   ├── ai/
│   │   │   ├── generate/  # AI note generation endpoint
│   │   │   ├── parse-pdf/ # PDF parsing endpoint
│   │   │   └── chat/      # AI chat endpoint
│   │   └── auth/          # Authentication endpoints
│   ├── dashboard/         # Dashboard page
│   ├── auth/              # Authentication pages
│   └── page.tsx           # Landing page
├── components/            # Reusable React components
│   ├── landing/           # Landing page components
│   ├── dashboard/         # Dashboard components
│   └── ui/                # Shared UI components
├── contexts/              # React context providers
└── lib/                   # Utility functions
```

## 🤖 API Endpoints

### AI Services
- **POST** `/api/ai/generate` - Generate notes using AI
- **POST** `/api/ai/parse-pdf` - Parse and extract text from PDFs
- **POST** `/api/ai/chat` - Chat with AI about your notes

### Authentication
- **POST** `/api/auth/login` - User login
- **POST** `/api/auth/signup` - User registration
- **POST** `/api/auth/logout` - User logout

## 🔐 Security

- Firebase Authentication for secure user management
- Environment variables for sensitive credentials (never commit `.env.local`)
- Type-safe API calls with TypeScript

## 📱 Responsive Design

NoteVerse is fully responsive and works seamlessly on:
- Desktop computers
- Tablets
- Mobile devices

## 🎨 Customization

The application uses Tailwind CSS for styling. You can customize the design by:
- Modifying the `tailwind.config.ts` file
- Updating component styles in the respective component files
- Adjusting animations in components using Framer Motion

## 🚀 Deployment

### Deploy on Vercel (Recommended)

The easiest way to deploy NoteVerse is on [Vercel](https://vercel.com), the creators of Next.js:

1. Push your code to GitHub
2. Visit [vercel.com](https://vercel.com)
3. Import the repository
4. Add your environment variables in the Vercel dashboard
5. Click Deploy

For more details, check the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).

### Other Deployment Options

- **Docker**: Create a Dockerfile and deploy to any container platform
- **Self-hosted**: Build with `npm run build` and run with `npm start`
- **AWS/Google Cloud/Azure**: Follow platform-specific Next.js deployment guides

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Google Generative AI Documentation](https://ai.google.dev/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues and pull requests to help improve NoteVerse.

## 📄 License

This project is open source and available under the MIT License.

## 👤 Author

Created by [@abb4s08](https://github.com/abb4s08)
