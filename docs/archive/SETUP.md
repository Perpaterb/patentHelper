# Development Environment Setup Guide

Complete guide to setting up your local development environment for Family Helper App.

---

## 📋 Prerequisites Checklist

Before you begin, ensure you have:

- [ ] macOS, Linux, or Windows (with WSL2)
- [ ] Internet connection
- [ ] GitHub account (for version control)
- [ ] Text editor (VS Code recommended)

---

## 🛠️ Step 1: Install Required Software

### 1.1 Install Node.js v20 LTS

**macOS/Linux:**
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc  # or ~/.zshrc
nvm install 20
nvm use 20
nvm alias default 20

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

**Windows:**
- Download from: https://nodejs.org/
- Choose "20.x.x LTS" version
- Run installer, accept defaults

### 1.2 Install Docker Desktop

**All Platforms:**
- Download: https://www.docker.com/products/docker-desktop/
- Install and start Docker Desktop
- Verify installation:
  ```bash
  docker --version
  docker-compose --version
  ```

### 1.3 Install VS Code (Optional but Recommended)

- Download: https://code.visualstudio.com/
- Install recommended extensions (see below)

### 1.4 Install Git

**macOS:**
```bash
# Git comes with Xcode Command Line Tools
xcode-select --install
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install git
```

**Windows:**
- Download: https://git-scm.com/download/win

### 1.5 Install AWS CLI

**macOS:**
```bash
brew install awscli
```

**Linux:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**Windows:**
- Download: https://awscli.amazonaws.com/AWSCLIV2.msi

**Configure AWS:**
```bash
aws configure
# AWS Access Key ID: [Your IAM access key]
# AWS Secret Access Key: [Your IAM secret key]
# Default region name: ap-southeast-2
# Default output format: json
```

### 1.6 Install Terraform

**macOS:**
```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

**Linux:**
```bash
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform
```

**Windows:**
- Download: https://www.terraform.io/downloads

**Verify:**
```bash
terraform --version
```

---

## 📁 Step 2: Clone and Setup Repository

### 2.1 Clone Repository

```bash
cd ~/Dev  # or your preferred directory
git clone https://github.com/Perpaterb/patentHelper.git
cd patentHelper
```

### 2.2 Create Environment File

```bash
# Copy template
cp .env.example .env.local

# Edit with your actual values
# (Use nano, vim, or open in VS Code)
code .env.local  # if using VS Code
```

**Required Values to Fill In:**
- AWS credentials (from IAM user)
- Kinde client secret (from Kinde dashboard)
- Any other secrets marked with "your-*-here"

---

## 🐳 Step 3: Start Local Database

### 3.1 Start PostgreSQL with Docker

```bash
# Start database
docker-compose up -d

# Verify it's running
docker-compose ps

# View logs
docker-compose logs -f postgres
```

### 3.2 Verify Database Connection

```bash
# Connect to database CLI
docker-compose exec postgres psql -U dev_user -d family_helper_dev

# Inside psql:
\dt              # List tables (should show 23 tables)
\q               # Quit
```

### 3.3 Optional: Start pgAdmin (Web UI)

```bash
# Start with pgAdmin
docker-compose --profile tools up -d

# Access at: http://localhost:5050
# Email: admin@familyhelper.local
# Password: admin
```

---

## 💻 Step 4: VS Code Setup

### 4.1 Install Recommended Extensions

Open VS Code in the project directory:
```bash
code .
```

VS Code will prompt to install recommended extensions. Click **Install All**.

Or install manually:
- ESLint
- Prettier
- React Native Tools
- PostgreSQL client
- AWS Toolkit
- Terraform
- GitLens
- Docker

### 4.2 Verify Settings

- File > Preferences > Settings
- Search for "Format On Save" → Should be enabled
- Search for "Default Formatter" → Should be Prettier

---

## 📦 Step 5: Install Project Dependencies

We'll install dependencies for each part of the project as we build them.

### Phase 1: Backend Setup

```bash
cd backend
npm install

# Verify Prisma installation
npx prisma --version
```

### Phase 2: Web App Setup

```bash
cd web-admin
npm install

# Verify React installation
npm list react
```

### Phase 3: Mobile App Setup

```bash
cd mobile-main
npm install

# Install Expo CLI globally
npm install -g eas-cli

# Verify Expo installation
expo --version
```

### Phase 4: PH Messenger Setup

```bash
cd mobile-messenger
npm install
```

---

## 🧪 Step 6: Verify Setup

### 6.1 Test Backend

```bash
cd backend
npm test  # Should run Jest tests (when created)
```

### 6.2 Test Web App

```bash
cd web-admin
npm start  # Should open http://localhost:3000
```

### 6.3 Test Mobile App

```bash
cd mobile-main
npm start  # Starts Expo development server

# Scan QR code with Expo Go app on your phone
```

---

## 🔧 Troubleshooting

### Docker Issues

**Error: "Cannot connect to Docker daemon"**
```bash
# Make sure Docker Desktop is running
# Restart Docker Desktop
```

**Error: "Port 5432 already in use"**
```bash
# Stop existing PostgreSQL
brew services stop postgresql  # macOS
sudo service postgresql stop   # Linux

# Or change port in docker-compose.yml
```

### Node.js Issues

**Error: "command not found: node"**
```bash
# Restart terminal after installing Node.js
# Or check PATH:
echo $PATH | grep node
```

### Permission Issues

**Error: "EACCES: permission denied"**
```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

---

## 📚 Additional Resources

### Documentation Links
- **Node.js**: https://nodejs.org/docs/
- **React**: https://react.dev/
- **React Native**: https://reactnative.dev/
- **Expo**: https://docs.expo.dev/
- **Prisma**: https://www.prisma.io/docs/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Terraform**: https://www.terraform.io/docs/
- **AWS**: https://docs.aws.amazon.com/

### Project-Specific Docs
- **Architecture**: `README.md`
- **Features**: `appplan.md`
- **Examples**: `Initial.md`
- **AI Guidelines**: `CLAUDE.md`
- **Developer Q&A**: `aiMessageToDev.md`

---

## ✅ Setup Complete!

You should now have:
- [x] Node.js v20 LTS installed
- [x] Docker running with PostgreSQL
- [x] VS Code with recommended extensions
- [x] Git configured
- [x] AWS CLI configured
- [x] Terraform installed
- [x] Environment variables configured (.env.local)
- [x] Project dependencies installed

**Next Steps:**
1. Review `aiMessageToDev.md` for remaining action items
2. Start with Phase 1: Foundation (Terraform setup)
3. Follow the 6-phase development plan in `README.md`

---

## 🆘 Need Help?

- **Bug reports**: https://github.com/Perpaterb/patentHelper/issues
- **Questions**: See `aiMessageToDev.md` for clarifications
- **AWS issues**: Check AWS CloudWatch logs
- **Database issues**: Check `docker-compose logs postgres`

---

**Last Updated**: 2025-10-20
**Maintained By**: Development Team
