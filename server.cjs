const http = require('http');
const fs = require('fs');
const path = require('path');

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