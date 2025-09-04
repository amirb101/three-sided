# 🚀 Three-Sided React Version

Welcome to the **React version** of Three-Sided! This is a complete, modern rewrite of the original Three-Sided flashcard app, built with React, Vite, and Firebase.

## 🌟 **What's New in React Version**

### ✨ **Core Features**
- **🔐 User Authentication** - Sign in with Google, manage profiles
- **✏️ Flashcard Creation** - Create beautiful flashcards with AI assistance
- **📚 Study Mode** - Interactive study sessions with card flipping
- **🤖 AI Integration** - DeepSeek-powered hints, proofs, and suggestions
- **👥 Community Features** - Share and discover flashcards from other students
- **📱 Modern UI** - Responsive design with beautiful animations

### 🆚 **Comparison with Original Site**

| Feature | Original Site (`/`) | React Version (`/new/`) |
|---------|---------------------|-------------------------|
| **Authentication** | ✅ Basic | ✅ **Enhanced with profiles** |
| **Flashcard Creation** | ✅ Basic form | ✅ **Advanced with AI assistance** |
| **Study Mode** | ✅ Static display | ✅ **Interactive with navigation** |
| **AI Features** | ✅ DeepSeek integration | ✅ **Enhanced AI service** |
| **User Profiles** | ✅ Basic | ✅ **Full profile management** |
| **UI/UX** | ✅ Functional | ✅ **Modern & responsive** |
| **Code Quality** | ✅ Working | ✅ **React components & hooks** |

## 🚀 **Getting Started**

### **For Users**
1. **Visit the React version**: Go to `/new/` on your site
2. **Sign in**: Use your Google account to get started
3. **Create flashcards**: Use the enhanced creation interface
4. **Study mode**: Practice with interactive flashcards
5. **AI assistance**: Get AI-powered hints and improvements

### **For Developers**
1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Set up environment**: Copy `env.example` to `.env`
4. **Configure API keys**: Add your DeepSeek API key
5. **Run locally**: `npm run dev`
6. **Build**: `npm run build`

## 🛠️ **Technical Architecture**

### **Frontend Stack**
- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **CSS-in-JS** - Inline styles for component isolation

### **Backend Services**
- **Firebase Auth** - Google sign-in
- **Firestore** - Database for flashcards and users
- **Firebase Hosting** - Deployment platform

### **AI Integration**
- **DeepSeek API** - AI-powered flashcard enhancement
- **Fallback system** - Works even without AI service
- **Multiple AI features** - Hints, proofs, suggestions, related questions

## 📁 **Project Structure**

```
src/
├── components/           # React components
│   ├── FlashcardCreator.jsx    # Flashcard creation form
│   ├── StudyMode.jsx           # Interactive study interface
│   ├── AIFlashcardEnhancer.jsx # AI-powered enhancements
│   └── ...
├── services/            # Business logic services
│   ├── flashcardService.js     # Flashcard CRUD operations
│   ├── userService.js          # User profile management
│   ├── aiService.js            # AI integration service
│   └── ...
├── contexts/            # React contexts
│   └── AuthContext.jsx         # Authentication state
├── firebase.js          # Firebase configuration
├── App.jsx              # Main application component
└── main.jsx             # Application entry point
```

## 🔧 **Configuration**

### **Environment Variables**
Create a `.env` file in the `src/` directory:

```bash
# DeepSeek API Configuration
REACT_APP_DEEPSEEK_API_KEY=your_actual_api_key_here
```

### **Firebase Configuration**
The Firebase config is already set up in `src/firebase.js` with the production project.

## 🚀 **Deployment**

### **Automatic Deployment**
The React app automatically deploys to `/new/` when you run:
```bash
cd src && npm run build
cd .. && firebase deploy --only hosting
```

### **Build Output**
- **Source**: `src/` directory
- **Build**: `public/new/` directory
- **URL**: `https://your-site.com/new/`

## 🎯 **Key Features Deep Dive**

### **1. Flashcard Creation**
- **Rich form interface** with validation
- **AI-powered enhancement** suggestions
- **Tag and difficulty** classification
- **Public/private** sharing options

### **2. Study Mode**
- **Interactive card flipping** with animations
- **Navigation controls** (previous, next, restart)
- **Progress tracking** (card X of Y)
- **Hints and metadata** display

### **3. AI Integration**
- **Smart hints** generation
- **Step-by-step proofs** and explanations
- **Improvement suggestions** for better learning
- **Related questions** to deepen understanding

### **4. User Experience**
- **Responsive design** for all devices
- **Smooth animations** and transitions
- **Intuitive navigation** between modes
- **Professional appearance** with modern UI patterns

## 🔄 **Migration Strategy**

### **Current Status**
- ✅ **Original site** (`/`) - Fully functional, untouched
- ✅ **React version** (`/new/`) - Complete feature parity + enhancements

### **Future Plans**
1. **User testing** of React version
2. **Feature parity** verification
3. **Performance optimization**
4. **Gradual user migration**
5. **Final switch** when ready

## 🐛 **Troubleshooting**

### **Common Issues**

#### **AI Features Not Working**
- Check if `REACT_APP_DEEPSEEK_API_KEY` is set in `.env`
- Verify the API key is valid and has credits
- AI features fall back to basic suggestions if unavailable

#### **Build Errors**
- Ensure all dependencies are installed: `npm install`
- Check Node.js version compatibility
- Clear build cache: `rm -rf node_modules && npm install`

#### **Deployment Issues**
- Verify Firebase CLI is installed and authenticated
- Check Firebase project configuration
- Ensure build completes successfully before deployment

### **Getting Help**
- Check the browser console for error messages
- Verify Firebase project settings
- Test locally with `npm run dev` first

## 🎉 **What's Next?**

The React version is now **feature-complete** and ready for:
- **User testing** and feedback collection
- **Performance optimization** and code splitting
- **Additional features** based on user requests
- **Gradual migration** from the original site

## 🤝 **Contributing**

This React version maintains the same **open, community-driven** approach as the original Three-Sided:
- **Share flashcards** with the community
- **Learn together** with AI assistance
- **Build knowledge** collaboratively
- **Improve continuously** with feedback

---

**🎯 Goal**: Make `/new/` the **definitive Three-Sided experience** while keeping the original site fully functional for comparison and gradual migration.

**🚀 Status**: **Complete React migration** with enhanced features and modern architecture!
