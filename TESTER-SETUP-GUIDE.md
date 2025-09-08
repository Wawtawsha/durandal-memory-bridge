# 🧪 DevAssistant Tester Setup Guide

## 📋 **Quick Start Guide**

This is your complete DevAssistant testing package! Follow these steps to get up and running in minutes.

### 🚀 **System Requirements**
- **Node.js 18.0+** (Download from [nodejs.org](https://nodejs.org))
- **Claude API Key** (Get from [console.anthropic.com](https://console.anthropic.com))
- **Windows, macOS, or Linux**

---

## ⚡ **Installation (3 Steps)**

### **Step 1: Extract & Navigate**
```bash
# Extract the DevAssistant package to your desired location
cd path/to/devassistant-package
```

### **Step 2: Install Dependencies**
```bash
npm install
```

### **Step 3: Configure API Key**
Create a `.env` file in the root directory:
```bash
# Create .env file
echo "CLAUDE_API_KEY=your_api_key_here" > .env
```

**Or manually create `.env` file with:**
```
CLAUDE_API_KEY=sk-ant-api03-your-actual-key-here
```

---

## 🎯 **Running DevAssistant**

### **Option A: Web UI (Recommended)**
```bash
npm run devassistant-ui
```
**Then open:** `http://localhost:3002`

### **Option B: Command Line**
```bash
npm start
```

---

## 🧪 **Testing Features**

### **🌐 Web Interface Testing**
1. **Launch UI**: `npm run devassistant-ui`
2. **Open**: `http://localhost:3002` 
3. **Test Features**:
   - ✅ **Semantic Search**: Try "search for database connections"
   - ✅ **Code Analysis**: Upload a code file 
   - ✅ **Predictive Files**: Ask "what files should I work on?"
   - ✅ **Workspace Selection**: Click "📁 Workspace" button
   - ✅ **Health Check**: Should show "System Ready"

### **🔍 Key Test Scenarios**

**Workspace Management:**
1. Click "📁 Workspace" button
2. Try entering different project paths
3. Test workspace validation
4. Switch between workspaces

**AI Features:**
1. **Semantic Search**: "find authentication code"
2. **Code Analysis**: Ask about code quality
3. **File Predictions**: "suggest next files to work on"
4. **Knowledge Graph**: Explore code relationships

**System Health:**
- Check status indicators
- Monitor console logs
- Test error handling

---

## 🛠 **Advanced Commands**

### **Testing Suite**
```bash
# Run comprehensive tests
npm run test-full

# Quick system test
npm test

# Database tests
npm run test-db
```

### **Debug Mode**
```bash
# Development mode with auto-reload
npm run dev

# Debug RAMR cache system
npm run debug-ramr
```

---

## 📊 **What to Test & Report**

### **✅ Core Functionality**
- [ ] **Startup Success**: Does it launch without errors?
- [ ] **UI Loading**: Web interface loads completely
- [ ] **API Key**: Properly configured and working
- [ ] **Workspace Selection**: Modal opens and functions
- [ ] **Semantic Search**: Returns relevant results
- [ ] **File Analysis**: Analyzes code correctly
- [ ] **Performance**: Responsive under normal use

### **🚨 Issues to Report**
- **Startup Problems**: Error messages, crashes
- **UI Issues**: Broken layouts, missing buttons
- **Feature Failures**: Non-working search, analysis errors
- **Performance**: Slow responses, memory issues
- **API Issues**: Authentication errors, rate limiting

### **📝 Feedback Format**
Please report:
1. **Environment**: OS, Node.js version
2. **Steps**: What you were doing
3. **Expected**: What should happen
4. **Actual**: What actually happened
5. **Logs**: Any console errors
6. **Screenshots**: If UI issue

---

## 🔧 **Troubleshooting**

### **Common Issues**

**❌ "API Key Error"**
```bash
# Solution: Check your .env file
cat .env
# Should show: CLAUDE_API_KEY=sk-ant-api03-...
```

**❌ "Port Already in Use"**
```bash
# Solution: Use different port
PORT=3003 npm run devassistant-ui
```

**❌ "Module Not Found"**
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**❌ "Workspace Button Not Working"**
- Check browser console (F12)
- Look for JavaScript errors
- Try refreshing the page

### **Getting Help**
1. **Check logs**: Browser console (F12) and terminal
2. **Try restart**: Stop and restart the application
3. **Clean install**: Remove `node_modules` and reinstall
4. **Report issue**: Include logs and steps to reproduce

---

## 📚 **Key Features to Explore**

### **🎯 Phase 4: AI-Powered Features** (Latest!)
- **Semantic Code Search**: Natural language code queries
- **Knowledge Graph**: Visual code relationships
- **Predictive File Suggestions**: ML-powered recommendations
- **Automated Documentation**: AI-generated docs
- **Code Relationship Analysis**: Dependency analysis
- **Workspace Intelligence**: Project analysis and insights

### **🔧 Phase 1-3: Core Features**
- **Database Integration**: SQL connections and queries
- **Advanced File Processing**: PDF, Excel, CSV, XML, logs
- **50+ Advanced Commands**: `/health`, `/perf`, `/analyze`
- **Context Management**: Intelligent conversation context
- **System Monitoring**: Real-time health diagnostics

---

## 📈 **Success Metrics**

**✅ Successful Test Session:**
- Launches without errors
- All UI components load
- Semantic search returns results
- Workspace selector opens and works
- System health shows "Ready"
- Performance is responsive

**🎯 Excellent User Experience:**
- Intuitive interface
- Fast response times
- Helpful error messages
- Smooth workflow
- Professional appearance

---

## 📞 **Support & Feedback**

This is a comprehensive AI development assistant with cutting-edge features. Your testing helps improve the user experience for all developers!

**Happy Testing! 🚀**

---

*DevAssistant v4.0 - Advanced AI-Powered Development Assistant*
*Built with Vue.js, Node.js, and Claude API*