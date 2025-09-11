# 📚 Three-Sided Flashcard System

Welcome to **Three-Sided** - a comprehensive flashcard system with **dual frontend architecture** and **AI-powered learning**.

## 🏗️ **System Overview**

Three-Sided operates with **two complete systems** that share the same Firebase backend:

| System | URL | Technology | Status | Use Case |
|--------|-----|------------|--------|----------|
| **Original** | `/` | Vanilla JS | ✅ Production | Stable, proven |
| **React** | `/new/` | React + Vite | ✅ Production | Modern, enhanced |

**🔑 Key Principle**: **100% backwards compatibility** - both systems work together seamlessly.

## 🚀 **Quick Start**

### **For Users**
- **Try the React version**: Visit `/new/` for modern UI and AI features
- **Use the original**: Visit `/` for the proven, stable interface
- **Mix and match**: Create profiles/cards with either system

### **For Developers**
- **📋 System Architecture**: Read [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)
- **⚛️ React Development**: Read [src/README.md](./src/README.md)
- **🔧 Deploy**: `firebase deploy`

## 📖 **Documentation**

### **📋 [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)**
Complete technical documentation covering:
- Card creation systems (old vs React)
- Profile systems and compatibility
- Search & discovery mechanics
- Data flow diagrams
- Troubleshooting guides

### **⚛️ [src/README.md](./src/README.md)**
React-specific documentation:
- Component architecture
- Development guidelines
- Backwards compatibility rules
- Build and deployment

## 🎯 **Key Features**

### **✨ Shared Features** (Both Systems)
- **🔐 Google Authentication** - Shared user accounts
- **📚 Flashcard Creation** - Mathematical content with LaTeX
- **🔍 Search & Discovery** - Community flashcard browsing
- **👤 User Profiles** - Public profile pages with cards
- **💾 Same Backend** - Shared Firebase collections

### **🆕 React Enhancements** (`/new/`)
- **🤖 AI Integration** - DeepSeek-powered hints and suggestions  
- **🎨 Modern UI** - Responsive design with smooth animations
- **⚡ Better Performance** - Optimized loading and interactions
- **📱 Enhanced UX** - Improved navigation and user flow

## 🔄 **Backwards Compatibility**

Both systems are **fully compatible**:

```mermaid
graph TD
    A[User] --> B{Choose System}
    B -->|Original /| C[Vanilla JS Interface]
    B -->|React /new/| D[React Interface]
    C --> E[Shared Firebase Backend]
    D --> E
    E --> F[Same Data & URLs]
    F --> G[/card/slug URLs work]
    F --> H[/profile/slug URLs work]
```

**Examples**:
- Create profile with **original system** → Cards work in **React system** ✅
- Create cards with **React system** → Visible on **original profile page** ✅
- Same URLs work: `/card/my-card-slug` and `/profile/my-username` ✅

## 🗂️ **Firebase Collections**

### **Shared Backend Structure**
```
📁 Firebase Collections
├── 📄 publicCards/         # Public flashcards (both systems)
├── 📄 profiles/            # User profiles (both systems)  
├── 📄 userToSlug/          # Profile slug mapping (both systems)
├── 📄 flashcards/          # Private cards (original system)
├── 📄 cards/               # Private cards (React system)
├── 📄 userUpvotes/         # Upvote tracking (both systems)
└── 📄 automation*/         # Bot automation (admin only)
```

## 🛠️ **Development**

### **Local Development**
```bash
# React development
cd src
npm install
npm run dev

# Original system (no build needed)
firebase serve
```

### **Deployment**
```bash
# Build React version
cd src && npm run build

# Deploy everything
firebase deploy
```

### **Project Structure**
```
three-sided/
├── 📋 SYSTEM_ARCHITECTURE.md    # Complete system documentation
├── 📁 public/                   # Original system + built React
│   ├── 📄 index.html            # Original flashcard creation
│   ├── 📄 search.html           # Original search system
│   ├── 📁 card/                 # Shared card viewer  
│   ├── 📁 profile/              # Shared profile pages
│   └── 📁 new/                  # Built React application
├── 📁 src/                      # React source code
│   ├── ⚛️ README.md             # React-specific docs
│   ├── 📁 components/           # React components
│   └── 📁 services/             # Business logic
├── 📁 functions/                # Cloud Functions
├── 🔒 firestore.rules          # Database security
└── ⚙️ firebase.json            # Hosting configuration
```

## 🎯 **System Philosophy**

### **🔄 Backwards Compatibility First**
- New features must work with old system
- Old URLs must continue working  
- Same data schema across systems
- Gradual migration, not replacement

### **🚀 Progressive Enhancement**
- Original system: **Stable foundation**
- React system: **Enhanced experience**
- Users choose based on preference
- Both maintained and improved

### **🤖 AI-Powered Learning** 
- DeepSeek integration for smart suggestions
- Automated content generation
- Enhanced learning experience
- Fallback to manual when AI unavailable

## 🆘 **Need Help?**

### **📚 Documentation**
1. **System overview**: This file
2. **Technical details**: [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)  
3. **React development**: [src/README.md](./src/README.md)

### **🐛 Common Issues**
- **Profile cards not showing**: Check [SYSTEM_ARCHITECTURE.md#troubleshooting](./SYSTEM_ARCHITECTURE.md#troubleshooting)
- **Card URLs 404**: Ensure document ID matches slug
- **Permission errors**: Check updated Firestore rules

### **🔧 Debug Steps**
```javascript
// Check profile exists
const userSlug = await db.collection('userToSlug').doc(userId).get();

// Check cards by user  
const userCards = await db.collection('publicCards').where('userId', '==', userId).get();

// Check card by slug
const card = await db.collection('publicCards').doc(slug).get();
```

---

**🎯 Mission**: Provide the best flashcard learning experience through **dual-system architecture** with **seamless compatibility** and **AI enhancement**.

**🚀 Status**: **Production ready** with both systems fully operational and compatible!