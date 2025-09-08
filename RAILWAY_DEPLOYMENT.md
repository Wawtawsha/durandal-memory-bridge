# Railway Deployment Guide - Memory API Bridge

## 🚀 **Ready for Deployment!**

Your Memory API Bridge is now configured for Railway deployment. Here's your step-by-step deployment guide:

## 📋 **Prerequisites**

1. **GitHub Account** - To store your code
2. **Railway Account** - Sign up at https://railway.app
3. **Credit Card** - For Railway's $5/month plan

## 🔧 **Files Created for Deployment**

✅ `railway.toml` - Railway configuration
✅ `Procfile` - Process definition  
✅ `.env.example` - Environment variable template
✅ Updated `package.json` with start command
✅ Updated `memory-api-server.js` for production

## 🌐 **Deployment Steps**

### **Step 1: Push to GitHub**
```bash
cd "C:\Users\Donnager\Desktop\Claude\pog\projectDir\claude-chatbot"
git init
git add .
git commit -m "Add Memory API Bridge for Railway deployment"
git branch -M main
git remote add origin https://github.com/yourusername/memory-api-bridge.git
git push -u origin main
```

### **Step 2: Connect Railway to GitHub**
1. Go to https://railway.app
2. Sign up/login with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository
6. Railway will auto-detect Node.js and start deploying

### **Step 3: Set Environment Variables**
In Railway dashboard, go to Variables and add:

**Required Variables:**
- `CLAUDE_API_KEY` = your_claude_api_key
- `DB_HOST` = your_local_ip_address (find with `ipconfig`)
- `DB_PASSWORD` = your_postgresql_password
- `MEMORY_API_KEY` = durandal-memory-api-key

**Optional Variables:**
- `DB_USER` = claude_user (default)
- `DB_NAME` = claude_memory (default)  
- `DB_PORT` = 5432 (default)

### **Step 4: Get Your Public URL**
After deployment, Railway provides a URL like:
`https://your-app-name.railway.app`

## 🧪 **Testing Your Deployed API**

### **Test Health Check:**
```bash
curl https://your-app-name.railway.app/health
```
Should return: `{"status":"healthy","timestamp":"...","memorySystemReady":true}`

### **Test Project Init:**
```bash
curl -X POST "https://your-app-name.railway.app/api/projects/claude-code/init" \
  -H "x-api-key: durandal-memory-api-key"
```

## 🔧 **Important Notes**

### **Database Connection**
Your local PostgreSQL must be accessible from the internet:
1. **Find your public IP**: Visit whatismyipaddress.com
2. **Configure PostgreSQL**: Edit `postgresql.conf` and `pg_hba.conf`
3. **Router Settings**: Forward port 5432 to your machine
4. **Firewall**: Allow PostgreSQL traffic

### **Alternative: Use Railway PostgreSQL**
If local database connection is complex:
1. Add Railway PostgreSQL addon ($5/month extra)
2. Migrate your data to Railway's database
3. Update environment variables to use Railway DB

## 💰 **Cost Breakdown**
- **Railway Web Service**: $5/month
- **Railway PostgreSQL** (optional): $5/month
- **Total**: $5-10/month

## 🎯 **Success Indicators**

✅ **Deployment succeeds** - Railway shows "Success" status
✅ **Health check works** - `/health` returns healthy status
✅ **Database connects** - No connection errors in logs
✅ **API responses** - All endpoints return valid JSON

## 🚨 **Troubleshooting**

### **Common Issues:**
- **Build fails**: Check Node.js version in `package.json` engines
- **Database connection fails**: Verify IP, port, credentials
- **API returns 500**: Check Railway logs for error details

### **View Railway Logs:**
In Railway dashboard, click your service → View logs

## 🔄 **Next Steps After Deployment**

1. **Test all endpoints** with your public URL
2. **Update CORS settings** if needed for other domains
3. **Monitor usage** in Railway dashboard
4. **Set up custom domain** (optional)

Your Memory API Bridge will be publicly accessible and ready for Claude Code integration!

## 📞 **Support**

If deployment issues occur:
- Check Railway documentation
- Review Railway logs
- Verify all environment variables are set
- Test database connectivity from external tools

**The goal**: Your local Durandal memory system accessible via `https://your-app.railway.app` 🎉