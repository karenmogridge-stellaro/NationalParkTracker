# GitHub Setup Instructions for National Park Tracker

Your git repository is now configured with your personal account and ready to connect to GitHub!

## Current Configuration
- **Git User**: Karen Mogridge
- **Email**: karenmogridge@gmail.com
- **Repository**: Initialized locally
- **Branch**: main
- **Initial Commit**: ✅ Complete

## Next Steps: Connect to GitHub

### 1. Create Repository on GitHub

1. Go to https://github.com/new
2. Enter repository name: **NationalParkTracker**
3. Description: `Track your national park adventures with gamification, fitness integration, and leaderboards`
4. Choose **Private** or **Public** (your preference)
5. Do NOT initialize with README (we already have one)
6. Click "Create repository"

### 2. Add Remote and Push

After creating the repository on GitHub, run these commands:

```bash
cd /Users/karen.mogridge/VSCodeProjects/NationalParkTracker

# Add the remote (replace YOUR_USERNAME with karenmogridge-stellaroo)
git remote add origin https://github.com/karenmogridge-stellaroo/NationalParkTracker.git

# Rename branch to main if needed
git branch -M main

# Push to GitHub
git push -u origin main
```

### 3. Verify Connection

```bash
git remote -v
# Should show your GitHub repo
```

## Authentication

### Option A: HTTPS (Recommended for simplicity)
When you `git push`, you'll be prompted for credentials:
- Use your GitHub username: `karenmogridge-stellaroo`
- Use a **Personal Access Token** (not password):
  1. Go to GitHub Settings → Developer Settings → Personal Access Tokens
  2. Generate new token with `repo` scope
  3. Use as password when prompted

### Option B: SSH (More secure)
```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "karenmogridge@gmail.com"

# Add to GitHub:
# 1. Copy the public key: cat ~/.ssh/id_ed25519.pub
# 2. Go to GitHub Settings → SSH Keys
# 3. Add new SSH key

# Then use SSH remote:
git remote set-url origin git@github.com:karenmogridge-stellaroo/NationalParkTracker.git
```

## Commands Reference

```bash
# Check current configuration
git config --list

# View committed files
git log --oneline

# Check git status
git status

# Add and commit changes
git add .
git commit -m "Your message here"

# Push to GitHub
git push origin main

# Pull latest changes
git pull origin main
```

## Important Files Tracked
- ✅ All source code (backend & frontend)
- ✅ Configuration files
- ✅ Documentation

## Important Files Ignored
- ❌ `npt.db` (local database)
- ❌ `.env` files (sensitive)
- ❌ `node_modules/` and `__pycache__/` (dependencies)
- ❌ Build artifacts and logs

---

**Your repository is ready!** 🎉 Just create the GitHub repo and push. All future commits will be under your personal account (karenmogridge@gmail.com).
