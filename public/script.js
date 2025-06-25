// public/script.js (최종 완성본)

document.addEventListener("DOMContentLoaded", () => {
    // --- 1. 모든 페이지에서 공통으로 실행되는 내비게이션 바 업데이트 ---
    const navAuthContainer = document.querySelector('.nav-auth');
    if (navAuthContainer) {
        const updateNav = async () => {
            try {
                const response = await fetch('/api/session');
                if (!response.ok) throw new Error('세션 정보를 가져오는데 실패했습니다.');
                const data = await response.json();
                
                if (data.loggedIn) {
                    navAuthContainer.innerHTML = `<span class="nav-username">${data.user.username}님</span><a href="#" id="logout-btn" class="nav-button logout">로그아웃</a>`;
                    document.getElementById('logout-btn').addEventListener('click', async (e) => {
                        e.preventDefault();
                        await fetch('/api/logout');
                        window.location.reload();
                    });
                } else {
                    navAuthContainer.innerHTML = `<a href="/login.html" class="nav-button login">로그인</a><a href="/register.html" class="nav-button register">회원가입</a>`;
                }

                if (document.getElementById("add-server-form")) {
                    renderAddServerForm(data.loggedIn);
                }
                
            } catch (error) {
                console.error('네비게이션 업데이트 중 오류:', error);
                navAuthContainer.innerHTML = `<span style="color:red;">오류</span>`;
            }
        };
        updateNav();
    }

    // --- 2. 페이지별 스크립트 실행 ---

    // ## 회원가입 페이지 (register.html) ##
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        const authMessage = document.getElementById('auth-message');
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            authMessage.textContent = '';
            authMessage.className = 'message';
            const data = Object.fromEntries(new FormData(registerForm).entries());

            if (data.password !== data['confirm-password']) {
                authMessage.textContent = '비밀번호가 일치하지 않습니다.';
                authMessage.classList.add('error');
                return;
            }
            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: data.username, password: data.password })
                });
                const result = await response.json();
                if (response.ok) {
                    authMessage.textContent = '회원가입 성공! 로그인 페이지로 이동합니다.';
                    authMessage.classList.add('success');
                    setTimeout(() => { window.location.href = '/login.html'; }, 2000);
                } else {
                    authMessage.textContent = result.message || '알 수 없는 오류가 발생했습니다.';
                    authMessage.classList.add('error');
                }
            } catch (error) {
                authMessage.textContent = '네트워크 오류가 발생했습니다.';
                authMessage.classList.add('error');
            }
        });
    }

    // ## 로그인 페이지 (login.html) ##
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        const authMessage = document.getElementById('auth-message');
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            authMessage.textContent = '';
            authMessage.className = 'message';
            const data = Object.fromEntries(new FormData(loginForm).entries());
            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (res.ok) {
                    authMessage.textContent = '로그인 성공! 잠시 후 모니터링 페이지로 이동합니다.';
                    authMessage.classList.add('success');
                    setTimeout(() => window.location.href = '/monitor.html', 1500);
                } else {
                    authMessage.textContent = result.message || '알 수 없는 오류가 발생했습니다.';
                    authMessage.classList.add('error');
                }
            } catch (err) {
                authMessage.textContent = '네트워크 오류가 발생했습니다.';
                authMessage.classList.add('error');
            }
        });
    }

    // ## 서버 모니터링 페이지 (monitor.html) ##
    const serverListContainer = document.getElementById("server-list");
    if (serverListContainer) {
        const socket = io();

        const totalServersEl = document.getElementById("total-servers");
        const onlineServersEl = document.getElementById("online-servers");
        const lastUpdateEl = document.getElementById("last-update-time");
        const noServersMessageHTML = '<p id="no-servers-message">등록된 서버가 없습니다. 새 서버를 추가해주세요.</p>';
        const addServerForm = document.getElementById("add-server-form");

        const renderServerCard = (serverInfo, status) => {
            const isOnline = status.online;
            const owner = serverInfo.User?.username || 'System';
            return `
                <div class="server-card" id="server-${serverInfo.id}">
                    <div class="card-header">
                        <h3><span class="status-indicator ${isOnline ? 'online' : 'offline'}"></span>${serverInfo.name}</h3>
                        ${owner !== 'System' ? `<button class="delete-server-btn" data-id="${serverInfo.id}"><i class="fas fa-trash-alt"></i> 삭제</button>` : ''}
                    </div>
                    <div class="card-body">
                        <p class="description">${serverInfo.description || '서버 설명이 없습니다.'}</p>
                        <div class="status-details">
                            <div class="detail-item"><span class="detail-label"><i class="fas fa-network-wired"></i> 주소</span><span class="host-address-value">${serverInfo.host}:${serverInfo.port}</span></div>
                            <div class="detail-item"><span class="detail-label"><i class="fas fa-signal"></i> 상태</span><span class="status-text ${isOnline ? 'online' : 'offline'}">${isOnline ? '온라인' : '오프라인'}</span></div>
                            <div class="detail-item"><span class="detail-label"><i class="fas fa-users"></i> 접속자</span><span class="players-value">${isOnline ? `${status.players.online} / ${status.players.max}` : 'N/A'}</span></div>
                            <div class="detail-item"><span class="detail-label"><i class="fas fa-gamepad"></i> 버전</span><span class="version-value">${isOnline ? status.version : 'N/A'}</span></div>
                            <div class="detail-item"><span class="detail-label"><i class="fas fa-tachometer-alt"></i> 핑</span><span class="ping-value">${isOnline ? `${status.ping}ms` : 'N/A'}</span></div>
                        </div>
                    </div>
                </div>
            `;
        };
        
        const updateMonitoringInfo = () => {
            const total = document.querySelectorAll('.server-card').length;
            const online = document.querySelectorAll('.server-card .status-indicator.online').length;
            if (totalServersEl) totalServersEl.textContent = total;
            if (onlineServersEl) onlineServersEl.textContent = online;
            if (lastUpdateEl) lastUpdateEl.textContent = `마지막 업데이트: ${new Date().toLocaleTimeString()}`;
        };

        socket.on('initialServers', (servers) => {
            if (servers.length === 0) {
                serverListContainer.innerHTML = noServersMessageHTML;
            } else {
                const serverCardsHTML = servers
                    .map(({ serverInfo, status }) => renderServerCard(serverInfo, status))
                    .join('');
                serverListContainer.innerHTML = serverCardsHTML;
            }
            updateMonitoringInfo();
        });

        socket.on('serverStatusUpdate', ({ serverInfo, status }) => {
            const card = document.getElementById(`server-${serverInfo.id}`);
            if (card) {
                card.outerHTML = renderServerCard(serverInfo, status);
                updateMonitoringInfo();
            }
        });

        socket.on('serverAdded', ({ server, status }) => {
            const noServersMessage = document.getElementById('no-servers-message');
            if (noServersMessage) {
                noServersMessage.remove();
            }
            serverListContainer.insertAdjacentHTML('beforeend', renderServerCard(server, status));
            updateMonitoringInfo();
        });

        socket.on('serverRemoved', ({ id }) => {
            const card = document.getElementById(`server-${id}`);
            if (card) {
                card.remove();
                updateMonitoringInfo();
            }
            if (serverListContainer.children.length === 0) {
                 serverListContainer.innerHTML = noServersMessageHTML;
            }
        });
        
        if (addServerForm) {
            addServerForm.addEventListener("submit", handleAddServerSubmit);
        }

        serverListContainer.addEventListener('click', async (e) => {
            if (e.target && e.target.closest('.delete-server-btn')) {
                const button = e.target.closest('.delete-server-btn');
                const serverId = button.dataset.id;
                if (confirm('정말로 이 서버를 삭제하시겠습니까?')) {
                    try {
                        const response = await fetch(`/api/servers/${serverId}`, { method: 'DELETE' });
                        const result = await response.json();
                        if (!response.ok) {
                            alert(result.error || '삭제 중 오류 발생');
                        }
                    } catch (err) {
                        alert('네트워크 오류로 삭제에 실패했습니다.');
                    }
                }
            }
        });
    }
});

function renderAddServerForm(isLoggedIn) {
    const addServerFormContainer = document.getElementById("add-server-form");
    if (!addServerFormContainer) return;

    if(isLoggedIn) {
        addServerFormContainer.innerHTML = `
            <div class="form-group"><label for="server-name">서버 이름</label><input type="text" id="server-name" name="name" required placeholder="예: 나의 멋진 서버"></div>
            <div class="form-group"><label for="server-host">서버 주소</label><input type="text" id="server-host" name="host" required placeholder="예: play.example.com"></div>
            <div class="form-group"><label for="server-port">포트</label><input type="number" id="server-port" name="port" value="25565" required></div>
            <div class="form-group"><label for="server-description">설명</label><textarea id="server-description" name="description" rows="3" placeholder="서버에 대한 간략한 설명을 입력하세요."></textarea></div>
            <button type="submit" class="submit-button">서버 추가하기</button>`;
    } else {
        addServerFormContainer.innerHTML = `<div class="login-prompt"><p>서버를 추가하려면 <a href="/login.html">로그인</a>이 필요합니다.</p></div>`;
    }
}

async function handleAddServerSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formMessage = document.getElementById("form-message");
    if (formMessage) {
        formMessage.textContent = "";
        formMessage.className = "message";
    }
    const serverData = Object.fromEntries(new FormData(form).entries());
    try {
        const response = await fetch("/api/servers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(serverData) });
        const result = await response.json();
        if (response.ok) {
            if (formMessage) {
                formMessage.textContent = result.message || '서버가 성공적으로 추가되었습니다.';
                formMessage.classList.add("success");
            }
            form.reset();
        } else {
            if (formMessage) {
                formMessage.textContent = `서버 추가 실패: ${result.error || "알 수 없는 오류"}`;
                formMessage.classList.add("error");
            }
        }
    } catch (error) {
        if (formMessage) {
            formMessage.textContent = `네트워크 오류: ${error.message}`;
            formMessage.classList.add("error");
        }
    }
}