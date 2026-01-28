require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const localtunnel = require('localtunnel');
const https = require('https');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// إعداد مجلد الصور
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)){ fs.mkdirSync(uploadDir); }
app.use('/uploads', express.static('uploads')); // جعل الصور عامة

// إعداد Multer للتخزين
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

app.set('trust proxy', true);

const PORT = process.env.PORT || 7026;
const SUBDOMAIN = 'hhjk-shop-final-v2'; 

let CURRENT_TUNNEL_URL = "";
let ADMIN_REAL_EMAIL = "";
let tunnelInstance = null;
let isReconnecting = false;

// --- Anti-Crash & Reconnect ---
process.on('uncaughtException', (err) => { console.log('⚠️ Error:', err.message); forceReconnect(); });
process.on('unhandledRejection', (r) => console.log('⚠️ Rejection:', r));

function forceReconnect() {
    if (isReconnecting) return; isReconnecting = true;
    if (tunnelInstance) try { tunnelInstance.close(); } catch(e){}
    setTimeout(() => { isReconnecting = false; startTunnel(); }, 5000);
}

function startKeepAlive() {
    setInterval(() => { if (CURRENT_TUNNEL_URL) https.get(CURRENT_TUNNEL_URL, ()=>{}).on('error', ()=>{}); }, 15000);
}

async function startTunnel() {
    if (isReconnecting) return; isReconnecting = true;
    try {
        tunnelInstance = await localtunnel({ port: PORT, subdomain: SUBDOMAIN });
        if (!tunnelInstance.url.includes(SUBDOMAIN)) {
            tunnelInstance.close(); setTimeout(() => { isReconnecting=false; startTunnel(); }, 5000); return;
        }
        CURRENT_TUNNEL_URL = tunnelInstance.url.replace('http:', 'https:');
        console.log(`✅ الرابط: ${CURRENT_TUNNEL_URL}`);
        isReconnecting = false;
        tunnelInstance.on('close', forceReconnect);
        tunnelInstance.on('error', forceReconnect);
    } catch (error) { setTimeout(() => { isReconnecting=false; startTunnel(); }, 5000); }
}

function getTunnelPassword() {
    return new Promise((resolve, reject) => {
        https.get('https://loca.lt/mytunnelpassword', (res) => {
            let data = ''; res.on('data', c=>data+=c); res.on('end', ()=>resolve(data.trim()));
        }).on('error', reject);
    });
}

// --- Database ---
const DB_FILE = 'database.json';
let db = { products: [], orders: [] };
if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE));
function saveDb() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }

// --- Gmail ---
const getOAuthClient = () => new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET, `${CURRENT_TUNNEL_URL}/auth/google/callback`);

async function fetchAdminProfile() {
    try {
        if (!fs.existsSync('tokens.json')) return;
        const oauth2Client = getOAuthClient();
        oauth2Client.setCredentials(JSON.parse(fs.readFileSync('tokens.json')));
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const profile = await gmail.users.getProfile({ userId: 'me' });
        ADMIN_REAL_EMAIL = profile.data.emailAddress;
    } catch (e) {}
}

async function getNetflixCode() {
    const oauth2Client = getOAuthClient();
    if (fs.existsSync('tokens.json')) oauth2Client.setCredentials(JSON.parse(fs.readFileSync('tokens.json')));
    else throw new Error("يجب ربط الحساب");
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const res = await gmail.users.messages.list({ userId: 'me', q: 'from:info@account.netflix.com', maxResults: 1 });
    if (!res.data.messages || !res.data.messages.length) throw new Error("لا توجد رسائل");
    
    const message = await gmail.users.messages.get({ userId: 'me', id: res.data.messages[0].id, format: 'full' });
    
    const getBody = (payload) => {
        let body = "";
        if (payload.body && payload.body.data) body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
        else if (payload.parts) {
            const part = payload.parts.find(p => p.mimeType === 'text/plain') || payload.parts.find(p => p.mimeType === 'text/html');
            if (part && part.body.data) body = Buffer.from(part.body.data, 'base64').toString('utf-8');
            else if (payload.parts[0].parts) return getBody(payload.parts[0]);
        }
        return body;
    };
    
    const snippet = message.data.snippet; 
    const fullBody = getBody(message.data.payload); 
    const cleanBody = fullBody ? fullBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ') : "";

    let match = snippet.match(/\b\d{4}\b/);
    if (!match && cleanBody) match = cleanBody.match(/\b\d{4}\b/);
    if (match) return match[0];
    throw new Error("فشل استخراج الكود");
}

// --- Routes ---
app.get('/auth/google', (req, res) => res.redirect(getOAuthClient().generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/userinfo.email'] })));
app.get('/auth/google/callback', async (req, res) => {
    try {
        const { tokens } = await getOAuthClient().getToken(req.query.code);
        fs.writeFileSync('tokens.json', JSON.stringify(tokens));
        await fetchAdminProfile();
        res.send("✅ تم الربط");
    } catch (e) { res.send("Error"); }
});

app.get('/products', (req, res) => res.json(db.products));

// إضافة منتج (يدعم رفع صورة البروفايل)
app.post('/admin/add-product', upload.single('profileImage'), (req, res) => {
    const fileData = req.file ? `/uploads/${req.file.filename}` : null;
    
    const newProduct = {
        id: Date.now(),
        type: req.body.type,
        name: req.body.name,
        price: req.body.price,
        accountEmail: req.body.accountEmail,      // للحساب الكامل
        accountPassword: req.body.accountPassword,// للحساب الكامل
        profileName: req.body.profileName,        // لليوزر
        profilePin: req.body.profilePin,          // لليوزر
        profileImage: fileData                    // صورة البروفايل لليوزر
    };

    db.products.push(newProduct);
    saveDb(); 
    res.json({ success: true });
});

// الشراء (يدعم رفع صورة الإيصال)
app.post('/buy', upload.single('receipt'), (req, res) => { 
    const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const receiptImg = req.file ? `/uploads/${req.file.filename}` : null;

    // العثور على اسم المنتج
    const product = db.products.find(p => p.id == req.body.productId);
    const productName = product ? product.name : "منتج غير معروف";

    db.orders.push({ 
        orderId: Date.now(),
        productId: req.body.productId,
        productName: productName,
        userPhone: req.body.userPhone,
        receiptImage: receiptImg, // صورة التحويل
        status: 'pending', 
        fetchedCode: null,
        userIp: userIp,
        createdAt: new Date(),
        approvedAt: null,
        codeFetchedAt: null
    }); 
    saveDb(); 
    res.json({ success: true, orderId: Date.now() }); 
});

app.get('/order-status/:orderId', (req, res) => {
    const order = db.orders.find(o => o.orderId == req.params.orderId);
    if (!order) return res.json({ status: 'not-found' });
    
    if (order.status === 'approved' || order.status === 'completed') {
        const product = db.products.find(p => p.id == order.productId);
        
        let responseData = {
            status: order.status,
            savedCode: order.fetchedCode,
            requiresCode: product.type === 'netflix-user'
        };

        if (product.type === 'netflix-user') {
            // إرسال بيانات البروفايل فقط
            responseData.profileName = product.profileName;
            responseData.profilePin = product.profilePin;
            responseData.profileImage = product.profileImage;
            responseData.accountEmail = ADMIN_REAL_EMAIL; // الإيميل الأساسي لاستقبال الكود
        } else {
            // إرسال بيانات الحساب الكامل
            responseData.accountEmail = product.accountEmail;
            responseData.accountPassword = product.accountPassword;
        }

        return res.json(responseData);
    }
    res.json({ status: order.status });
});

app.get('/admin/orders', (req, res) => res.json(db.orders));

app.post('/admin/approve', (req, res) => { 
    const order = db.orders.find(o => o.orderId == req.body.orderId); 
    if(order) { 
        order.status = 'approved'; 
        order.approvedAt = new Date(); 
        saveDb(); 
        res.json({success:true}); 
    } 
    else res.json({success:false}); 
});

app.post('/get-code-secure', async (req, res) => {
    const { orderId } = req.body;
    const order = db.orders.find(o => o.orderId == orderId);
    if (!order) return res.json({ success: false, message: "غير موجود" });
    if (order.fetchedCode) return res.json({ success: true, code: order.fetchedCode, message: "تم الجلب" });
    try {
        const code = await getNetflixCode();
        order.fetchedCode = code; 
        order.status = 'completed'; 
        order.codeFetchedAt = new Date(); 
        saveDb();
        res.json({ success: true, code });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.listen(PORT, '0.0.0.0', async () => {
    await fetchAdminProfile();
    await startTunnel();
    getTunnelPassword().then(p => console.log(`🔐 Tunnel Password: ${p}`));
    startKeepAlive();
});