# 📂 Document Management System

A full-featured document management system that allows users to organize documents inside folders and workspaces, upload and preview files, download documents, soft-delete them to a recycle bin, and restore when needed — all powered by Node.js and MongoDB.

---

## 🚀 Features

- 🏢 Create and manage **Workspaces**
- 📁 Create **Folders** inside workspaces
- 📄 Upload **Documents** to folders or directly inside workspaces
- 👁️ Preview documents
- 📥 Download documents
- 🗑️ Soft-delete documents to a **Recycle Bin**
- ♻️ Restore deleted documents from Recycle Bin

---

## 🛠️ Tech Stack

- **Backend**: Node.js (Express)
- **Database**: MongoDB with Mongoose and GridFS
- **ORM for PostgreSQL**: Prisma
- **Authentication**: JWT + HTTP-only cookies + CSRF protection

---

## 📦 Dependencies

### ✅ Production Dependencies
These are installed via `npm install`:

```json
"@prisma/client": "^6.11.1",
"bcrypt": "^6.0.0",
"cookie-parser": "^1.4.7",
"cors": "^2.8.5",
"csurf": "^1.11.0",
"dotenv": "^17.1.0",
"express": "^5.1.0",
"gridfs": "^1.0.0",
"gridfs-stream": "^1.1.1",
"jsonwebtoken": "^9.0.2",
"mime-types": "^3.0.1",

# MongoDB connection string (used for folders, documents, and files)
MONGO_URI=mongodb://localhost:27017/your-mongo-db

# PostgreSQL connection string (used for user authentication and other relational data)
DATABASE_URL=postgresql://user:password@localhost:5432/your-postgres-db

# Secret for signing JWT tokens
JWT_SECRET=your_jwt_secret




"mongoose": "^8.16.2",
"multer": "^2.0.1"
