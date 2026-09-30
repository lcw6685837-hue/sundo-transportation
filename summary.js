// ===== 차량번호별 월간 집계 =====
const LOGIN_PAGE_URL = "login.html";

const db = firebase.database();

function logout() {
    firebase.auth().signOut();
}

document.addEventListener('DOMContentLoaded', () => {
    const monthInput = document.getElementById('summary-month');
    const tbody = document.getElementById('summary-tbody');
    const statusEl = document.getElementById('summary-status');
    const totalCountEl = document.getElementById('summary-total-count');
    const totalQtyEl = document.getElementById('summary-total-qty');

    // "12,800kg" 같은 표시용 문자열에서 숫자만 추출
    function parseQty(val) {
        if (!val) return 0;
        const digits = String(val).replace(/[^\d]/g, '');
        return digits ? parseInt(digits, 10) : 0;
    }

    function formatQty(n) {
        return n.toLocaleString('en-US') + 'kg';
    }

    function currentMonthStr() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    function loadSummary(monthStr) {
        tbody.innerHTML = '';
        totalCountEl.textContent = '0건';
        totalQtyEl.textContent = '0kg';
        statusEl.textContent = '불러오는 중...';

        const [year, month] = monthStr.split('-').map(Number);
        const startKey = `${monthStr}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endKey = `${monthStr}-${String(lastDay).padStart(2, '0')}`;

        db.ref('job_sheets').orderByKey().startAt(startKey).endAt(endKey).once('value')
            .then(snapshot => {
                const data = snapshot.val() || {};
                const byVehicle = {};

                Object.values(data).forEach(dayData => {
                    for (let i = 1; i <= 10; i++) {
                        const vehicle = (dayData[`deliv${i}_vehicle`] || '').trim();
                        if (!vehicle) continue;

                        if (!byVehicle[vehicle]) {
                            byVehicle[vehicle] = { count: 0, qty: 0 };
                        }
                        byVehicle[vehicle].count += 1;
                        byVehicle[vehicle].qty += parseQty(dayData[`deliv${i}_qty`]);
                    }
                });

                const vehicles = Object.keys(byVehicle).sort((a, b) => a.localeCompare(b, 'ko'));

                let totalCount = 0;
                let totalQty = 0;

                vehicles.forEach(vehicle => {
                    const row = document.createElement('div');
                    row.className = 'summary-row';
                    row.innerHTML = `
                        <div class="summary-cell">${vehicle}</div>
                        <div class="summary-cell">${byVehicle[vehicle].count}건</div>
                        <div class="summary-cell">${formatQty(byVehicle[vehicle].qty)}</div>
                    `;
                    tbody.appendChild(row);

                    totalCount += byVehicle[vehicle].count;
                    totalQty += byVehicle[vehicle].qty;
                });

                totalCountEl.textContent = `${totalCount}건`;
                totalQtyEl.textContent = formatQty(totalQty);

                statusEl.textContent = vehicles.length === 0
                    ? '해당 월에 등록된 납품 데이터가 없습니다.'
                    : '';
            })
            .catch(err => {
                console.error("집계 조회 오류:", err);
                statusEl.textContent = '데이터를 불러오지 못했습니다.';
            });
    }

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            monthInput.value = currentMonthStr();
            loadSummary(monthInput.value);
        } else {
            const loginUrl = new URL(LOGIN_PAGE_URL, window.location.href);
            if (loginUrl.pathname !== window.location.pathname) {
                window.location.replace(loginUrl.href);
            } else {
                console.warn("로그인되지 않았습니다. summary.js의 LOGIN_PAGE_URL에 로그인 페이지 경로를 지정하세요.");
            }
        }
    });

    monthInput.addEventListener('change', () => {
        if (monthInput.value) loadSummary(monthInput.value);
    });
});
