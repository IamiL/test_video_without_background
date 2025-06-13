const http = require('http');
const fs = require('fs');
const path = require('path');

// Утилиты для логирования
const getTimestamp = () => new Date().toISOString();
const getClientInfo = (req) => {
    return {
        ip: req.connection.remoteAddress || req.socket.remoteAddress ||
                (req.connection.socket ? req.connection.socket.remoteAddress : null),
        userAgent: req.headers['user-agent'] || 'Unknown',
        referer: req.headers.referer || 'Direct',
        acceptLanguage: req.headers['accept-language'] || 'Unknown'
    };
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const logRequest = (req, status, filePath, error = null, fileSize = null) => {
    const client = getClientInfo(req);
    const timestamp = getTimestamp();

    console.log(`\n${'='.repeat(80)}`);
    console.log(`[${timestamp}] REQUEST DETAILS`);
    console.log(`${'='.repeat(80)}`);
    console.log(`🌐 URL: ${req.method} ${req.url}`);
    console.log(`📍 Client IP: ${client.ip}`);
    console.log(`🖥️  User Agent: ${client.userAgent}`);
    console.log(`🔗 Referer: ${client.referer}`);
    console.log(`🌍 Accept-Language: ${client.acceptLanguage}`);
    console.log(`📁 File Path: ${filePath}`);

    if (fileSize !== null) {
        console.log(`📊 File Size: ${formatFileSize(fileSize)}`);
    }

    console.log(`📋 Headers:`);
    Object.keys(req.headers).forEach(key => {
        console.log(`   ${key}: ${req.headers[key]}`);
    });

    if (status >= 200 && status < 300) {
        console.log(`✅ Status: ${status} - SUCCESS`);
    } else if (status >= 300 && status < 400) {
        console.log(`↩️  Status: ${status} - REDIRECT`);
    } else if (status >= 400 && status < 500) {
        console.log(`⚠️  Status: ${status} - CLIENT ERROR`);
    } else if (status >= 500) {
        console.log(`❌ Status: ${status} - SERVER ERROR`);
    }

    if (error) {
        console.log(`💥 Error Details:`);
        console.log(`   Code: ${error.code || 'Unknown'}`);
        console.log(`   Message: ${error.message || 'Unknown error'}`);
        console.log(`   Stack: ${error.stack || 'No stack trace'}`);
    }

    console.log(`${'='.repeat(80)}\n`);
};

const PORT = 3000;
const DIST_DIR = path.join(__dirname, 'dist');
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME типы для разных файлов
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webm': 'video/webm',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
    // Получаем путь из URL
    let filePath;

    // Сначала проверяем в папке dist (скомпилированные файлы)
    if (req.url === '/') {
        filePath = path.join(DIST_DIR, 'index.html');
    } else {
        // Для статических файлов сначала проверяем public, потом dist
        const publicPath = path.join(PUBLIC_DIR, req.url);
        const distPath = path.join(DIST_DIR, req.url);

        // Проверяем существование в public папке
        if (fs.existsSync(publicPath)) {
            filePath = publicPath;
        } else {
            filePath = distPath;
        }
    }

    // Получаем расширение файла
    const extname = path.extname(filePath).toLowerCase();

    // Определяем MIME тип
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    // Проверяем существование файла
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // Если файл не найден, пытаемся отдать index.html (для SPA)
            if (extname === '' || extname === '.html') {
                filePath = path.join(DIST_DIR, 'index.html');
            } else {
                // Возвращаем 404 для статических файлов
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 - Файл не найден');
                return;
            }
        }

        // Читаем и отправляем файл
        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('404 - Файл не найден');
                } else {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('500 - Внутренняя ошибка сервера');
                }
            } else {
                // Устанавливаем заголовки
                const headers = {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=31536000' // Кеширование на год для статических файлов
                };

                // Для HTML файлов отключаем кеширование
                if (contentType === 'text/html') {
                    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
                    headers['Pragma'] = 'no-cache';
                    headers['Expires'] = '0';
                }

                res.writeHead(200, headers);
                res.end(content, 'utf-8');
            }
        });
    });
});

// Обработка ошибок сервера
server.on('error', (err) => {
    console.error('Ошибка сервера:', err);
});

// Запуск сервера
server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📁 Раздаём файлы из папок:`);
    console.log(`   - dist: ${DIST_DIR} (приоритет для скомпилированных файлов)`);
    console.log(`   - public: ${PUBLIC_DIR} (приоритет для статических файлов)`);
    console.log('📹 Поместите видео файлы в папку public/');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Остановка сервера...');
    server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});