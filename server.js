// server.js (최종 완성본)

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mc from 'minecraft-protocol';
import morgan from 'morgan';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { sequelize, User, Server } from './database.js';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer);
const PORT = process.env.PORT || 3000;
const monitoringIntervals = new Map();

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'a_much_more_secure_secret_key_please_change_this',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static('public'));

const fetchMinecraftServerStatus = async (host, port) => {
    try {
        const status = await mc.ping({ host, port, timeout: 5000 });
        return { online: true, players: status.players, version: status.version.name, ping: status.latency };
    } catch (err) {
        return { online: false, error: err.message || '연결 실패' };
    }
};

const startMonitoring = (server) => {
    if (monitoringIntervals.has(server.id)) {
        clearInterval(monitoringIntervals.get(server.id));
    }
    const intervalId = setInterval(async () => {
        const status = await fetchMinecraftServerStatus(server.host, server.port);
        io.emit('serverStatusUpdate', { serverInfo: server.toJSON(), status });
    }, 5 * 60 * 1000);
    monitoringIntervals.set(server.id, intervalId);
};

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password || password.length < 8) return res.status(400).json({ message: '사용자 이름과 8자 이상의 비밀번호를 입력해주세요.' });
    try {
        if (await User.findOne({ where: { username } })) return res.status(409).json({ message: '이미 사용 중인 사용자 이름입니다.' });
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ username, password: hashedPassword });
        res.status(201).json({ message: '회원가입 성공!' });
    } catch (error) { res.status(500).json({ message: '서버 오류가 발생했습니다.' }); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ where: { username } });
        if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: '사용자 이름 또는 비밀번호가 올바르지 않습니다.' });
        req.session.user = { id: user.id, username: user.username };
        res.json({ message: '로그인 성공!' });
    } catch (error) { res.status(500).json({ message: '서버 오류가 발생했습니다.' }); }
});

app.get('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ message: '로그아웃 성공' });
    });
});

app.get('/api/session', (req, res) => {
    res.json({ loggedIn: !!req.session.user, user: req.session.user || null });
});

app.post('/api/servers', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: '로그인이 필요합니다.' });
    const { name, host, port, description } = req.body;
    try {
        const newServer = await Server.create({ name, host, port, description, UserId: req.session.user.id });
        startMonitoring(newServer);
        const status = await fetchMinecraftServerStatus(newServer.host, newServer.port);
        io.emit('serverAdded', { server: { ...newServer.toJSON(), User: { username: req.session.user.username } }, status });
        res.status(201).json({ message: '서버가 성공적으로 추가되었습니다.' });
    } catch (error) { res.status(500).json({ error: '서버 추가 중 오류가 발생했습니다.' }); }
});

app.delete('/api/servers/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: '로그인이 필요합니다.' });
    const serverId = parseInt(req.params.id, 10);
    try {
        const server = await Server.findByPk(serverId, { include: User });
        if (!server) return res.status(404).json({ error: '서버를 찾을 수 없습니다.' });
        if (server.User?.username === 'System') return res.status(403).json({ error: '기본 서버는 삭제할 수 없습니다.' });
        if (server.UserId !== req.session.user.id) return res.status(403).json({ error: '서버를 삭제할 권한이 없습니다.' });
        
        await server.destroy();
        clearInterval(monitoringIntervals.get(serverId));
        monitoringIntervals.delete(serverId);
        io.emit('serverRemoved', { id: serverId });
        res.status(200).json({ message: '서버가 성공적으로 삭제되었습니다.' });
    } catch (error) { res.status(500).json({ error: '서버 삭제 중 오류가 발생했습니다.' }); }
});

io.on('connection', async (socket) => {
    const servers = await Server.findAll({ include: User });
    const initialData = await Promise.all(servers.map(async (server) => ({
        serverInfo: server,
        status: await fetchMinecraftServerStatus(server.host, server.port)
    })));
    socket.emit('initialServers', initialData);
});

const seedInitialServers = async () => {
    try {
        console.log('🌱 초기 서버 데이터 시딩을 시작합니다...');
        const [systemUser, created] = await User.findOrCreate({
            where: { username: 'System' },
            defaults: { username: 'System', password: await bcrypt.hash(`system_password_${Date.now()}`, 10) }
        });
        if(created) console.log("👤 'System' 관리자 유저 생성 완료.");

        const serversJsonPath = path.resolve('servers.json');
        const initialServersData = JSON.parse(fs.readFileSync(serversJsonPath, 'utf-8'));

        for (const serverData of initialServersData) {
            const { id, ...serverDetails } = serverData;
            await Server.findOrCreate({
                where: { host: serverDetails.host, port: serverDetails.port },
                defaults: { ...serverDetails, UserId: systemUser.id }
            });
        }
        console.log('✅ 초기 서버 데이터 시딩 완료.');
    } catch (error) {
        console.error('❌ 시딩 중 오류 발생:', error);
    }
};

const startServer = async () => {
    try {
        await sequelize.authenticate(); console.log('✅ 데이터베이스 연결 성공.');
        await sequelize.sync(); console.log('✅ 테이블 동기화 완료.');
        await seedInitialServers();
        (await Server.findAll({ include: User })).forEach(startMonitoring);
        httpServer.listen(PORT, () => console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다`));
    } catch (error) {
        console.error('❌ 서버 시작 실패:', error);
    }
};

startServer();