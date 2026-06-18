// Configurações e Estado Global
// NOTA: Cole aqui o link CSV publicado da sua planilha.
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTTqRYCxqqTeJLzCpTWOy9CAN_Dh8pWyQquoWLDeCtT8ThDgt4kqi40F5tEXnbAwEVqnzC01MZbOHqT/pub?output=csv';

let appData = {
    headers: [],
    rows: []
};

let charts = {}; // Para gerenciar as instâncias do Chart.js

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupTabs();
    setupEventListeners();
    fetchData();
});

// --- Tema Claro/Escuro ---
function initTheme() {
    const toggleBtn = document.getElementById('theme-toggle');
    const icon = toggleBtn.querySelector('i');
    
    toggleBtn.addEventListener('click', () => {
        const body = document.documentElement;
        if (body.getAttribute('data-theme') === 'light') {
            body.setAttribute('data-theme', 'dark');
            icon.classList.replace('fa-moon', 'fa-sun');
        } else {
            body.setAttribute('data-theme', 'light');
            icon.classList.replace('fa-sun', 'fa-moon');
        }
        renderCharts(); // Atualiza cores dos gráficos
    });
}

// --- Navegação por Abas ---
function setupTabs() {
    const btns = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            if(targetId === 'estatisticas') renderCharts();
        });
    });
}

// --- Captura de Dados (Google Sheets CSV) ---
async function fetchData() {
    try {
        const response = await fetch(SHEET_URL);
        const csvText = await response.text();
        parseCSV(csvText);
        
        // Processa as renderizações principais
        renderClassification();
        renderTop3();
        renderPredictions();
        updateGlobalStats();
    } catch (error) {
        console.error("Erro ao carregar dados da planilha:", error);
        document.querySelector('#table-classificacao tbody').innerHTML = 
            `<tr><td colspan="3">Erro ao carregar os dados. Verifique o link da planilha.</td></tr>`;
    }
}

// Parser simples de CSV
function parseCSV(csv) {
    // Divide por linhas e trata aspas simples do CSV gerado pelo Google
    const lines = csv.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return;

    // Extrai cabeçalhos
    appData.headers = lines[0].split(',').map(h => h.replace(/\r/g, '').trim());
    
    // Extrai linhas
    appData.rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.replace(/\r/g, '').trim());
        let rowData = {};
        appData.headers.forEach((header, index) => {
            rowData[header] = values[index] || '-';
        });
        return rowData;
    });

    // Ordena por pontos (assumindo que a coluna se chama "Pontos")
    const pontuacaoKey = appData.headers.find(h => h.toLowerCase().includes('ponto')) || appData.headers[2];
    appData.rows.sort((a, b) => parseInt(b[pontuacaoKey]) - parseInt(a[pontuacaoKey]));
}

// --- Aba 1: Classificação ---
function renderClassification(filterText = '') {
    const tbody = document.querySelector('#table-classificacao tbody');
    tbody.innerHTML = '';
    
    const participanteKey = appData.headers[1]; // Coluna B
    const pontosKey = appData.headers[2];       // Coluna C

    const filteredRows = appData.rows.filter(row => 
        row[participanteKey].toLowerCase().includes(filterText.toLowerCase())
    );

    filteredRows.forEach((row, index) => {
        let medal = index + 1;
        if (index === 0) medal = '🥇';
        else if (index === 1) medal = '🥈';
        else if (index === 2) medal = '🥉';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${medal}</td>
            <td class="highlight">${row[participanteKey]}</td>
            <td><strong>${row[pontosKey]}</strong></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderTop3() {
    const container = document.getElementById('top3-cards');
    container.innerHTML = '';
    
    if (appData.rows.length < 3) return;
    
    const partKey = appData.headers[1];
    const ptsKey = appData.headers[2];

    const top3 = [
        { data: appData.rows[1], pos: 2, medal: '🥈' }, // Segundo
        { data: appData.rows[0], pos: 1, medal: '🥇' }, // Primeiro
        { data: appData.rows[2], pos: 3, medal: '🥉' }  // Terceiro
    ];

    top3.forEach(item => {
        container.innerHTML += `
            <div class="card-top pos-${item.pos}">
                <div class="medal">${item.medal}</div>
                <div class="top-name">${item.data[partKey]}</div>
                <div class="top-pts">${item.data[ptsKey]} pts</div>
            </div>
        `;
    });
}

// --- Aba 2: Palpites ---
function renderPredictions() {
    const thead = document.querySelector('#table-palpites read');
    const tbody = document.querySelector('#table-palpites tbody');
    
    // Configura cabeçalho (Participante + Jogos)
    const partKey = appData.headers[1];
    const gamesHeaders = appData.headers.slice(3); // A partir da Coluna D
    
    let theadHTML = `<tr><th>Participante</th>`;
    gamesHeaders.forEach(game => {
        theadHTML += `<th>${game}</th>`;
    });
    theadHTML += `</tr>`;
    document.querySelector('#table-palpites thead').innerHTML = theadHTML;

    // Configura linhas
    tbody.innerHTML = '';
    appData.rows.forEach(row => {
        let tr = document.createElement('tr');
        let tdHTML = `<td><strong>${row[partKey]}</strong></td>`;
        
        gamesHeaders.forEach(game => {
            let palpite = row[game] === '-' ? '' : row[game];
            tdHTML += `<td>${palpite}</td>`;
        });
        
        tr.innerHTML = tdHTML;
        tbody.appendChild(tr);
    });
}

// --- Aba 3: Meu Desempenho ---
function searchUserPerformance(name) {
    const resultDiv = document.getElementById('resultado-desempenho');
    if (!name.trim()) {
        resultDiv.classList.add('hidden');
        return;
    }

    const partKey = appData.headers[1];
    const user = appData.rows.find(r => r[partKey].toLowerCase().includes(name.toLowerCase()));

    if (user) {
        resultDiv.classList.remove('hidden');
        
        const ptsKey = appData.headers[2];
        const gamesHeaders = appData.headers.slice(3);
        
        let jogosDisputados = 0;
        let placaresExatos = 0; // Necessário lógica comparativa se tiver os resultados reais. Simulando:
        
        const historyList = document.getElementById('user-historico');
        historyList.innerHTML = '';

        gamesHeaders.forEach(game => {
            const palpite = user[game];
            if (palpite !== '-') {
                jogosDisputados++;
                // Simulação: assumindo que quem cravou o placar recebe ícone de estrela.
                // Como não temos a coluna de resultado real, vamos apenas listar os palpites.
                const statusIcon = '✅'; 
                
                historyList.innerHTML += `
                    <div class="history-item">
                        <div><strong>${game}</strong></div>
                        <div>Palpite: ${palpite} ${statusIcon}</div>
                    </div>
                `;
            }
        });

        document.getElementById('user-total-pontos').innerText = user[ptsKey];
        document.getElementById('user-jogos').innerText = jogosDisputados;
        document.getElementById('user-exatos').innerText = "-"; // Depende de lógica adicional
    } else {
        resultDiv.classList.add('hidden');
    }
}

// --- Aba 4: Estatísticas ---
function updateGlobalStats() {
    const statsContainer = document.getElementById('geral-stats');
    const partKey = appData.headers[1];
    const ptsKey = appData.headers[2];
    
    const totalPart = appData.rows.length;
    const partPontuaram = appData.rows.filter(r => parseInt(r[ptsKey]) > 0).length;
    const lider = appData.rows[0] ? appData.rows[0][partKey] : '-';
    const jogosTotais = appData.headers.slice(3).length;

    statsContainer.innerHTML = `
        <div class="stat-card">
            <h3>Total de Participantes</h3>
            <p class="stat-value">${totalPart}</p>
        </div>
        <div class="stat-card">
            <h3>Já Pontuaram</h3>
            <p class="stat-value">${partPontuaram}</p>
        </div>
        <div class="stat-card">
            <h3>Rodadas/Jogos</h3>
            <p class="stat-value">${jogosTotais}</p>
        </div>
        <div class="stat-card">
            <h3>Líder Atual</h3>
            <p class="stat-value" style="font-size: 1.5rem;">${lider}</p>
        </div>
    `;
}

function renderCharts() {
    if (appData.rows.length === 0) return;
    
    const textColor = document.documentElement.getAttribute('data-theme') === 'dark' ? '#FFF' : '#1D1D1B';
    const ptsKey = appData.headers[2];
    const partKey = appData.headers[1];

    // Destruir gráficos anteriores para evitar sobreposição
    if(charts.pontos) charts.pontos.destroy();
    if(charts.top10) charts.top10.destroy();

    // Gráfico 1: Distribuição de Pontos (Histograma básico)
    const pontuacoes = appData.rows.map(r => parseInt(r[ptsKey]) || 0);
    const contagem = {};
    pontuacoes.forEach(p => contagem[p] = (contagem[p] || 0) + 1);

    const ctxPontos = document.getElementById('pontosChart').getContext('2d');
    charts.pontos = new Chart(ctxPontos, {
        type: 'bar',
        data: {
            labels: Object.keys(contagem).map(k => `${k} pts`),
            datasets: [{
                label: 'Nº de Participantes',
                data: Object.values(contagem),
                backgroundColor: '#0092DD',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: textColor } } },
            scales: {
                x: { ticks: { color: textColor } },
                y: { ticks: { color: textColor }, beginAtZero: true }
            }
        }
    });

    // Gráfico 2: Top 10 Participantes
    const top10Data = appData.rows.slice(0, 10);
    const ctxTop10 = document.getElementById('top10Chart').getContext('2d');
    charts.top10 = new Chart(ctxTop10, {
        type: 'doughnut',
        data: {
            labels: top10Data.map(r => r[partKey]),
            datasets: [{
                data: top10Data.map(r => parseInt(r[ptsKey]) || 0),
                backgroundColor: ['#0092DD', '#FDC533', '#2FAC66', '#E94362', '#005CA9', '#D88BB6', '#954B97', '#C6C6C6', '#1D1D1B', '#333333']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'right', labels: { color: textColor } } }
        }
    });
}

// --- Event Listeners e Funcionalidades Extras ---
function setupEventListeners() {
    // Busca na Classificação
    document.getElementById('search-classificacao').addEventListener('input', (e) => {
        renderClassification(e.target.value);
    });

    // Busca no Meu Desempenho
    document.getElementById('search-desempenho').addEventListener('input', (e) => {
        searchUserPerformance(e.target.value);
    });

    // Botão Salvar Imagem
    document.getElementById('btn-export').addEventListener('click', () => {
        const target = document.getElementById('tabela-export-area');
        html2canvas(target, { backgroundColor: null }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'classificacao-bolao-teto.png';
            link.href = canvas.toDataURL();
            link.click();
        });
    });

    // Botão Compartilhar
    document.getElementById('btn-share').addEventListener('click', () => {
        if (navigator.share) {
            navigator.share({
                title: 'Bolão TETO-PE',
                text: 'Confira a classificação atual do Bolão da TETO-PE!',
                url: window.location.href
            }).catch(console.error);
        } else {
            alert('A função de compartilhar não é suportada neste navegador. Copie a URL!');
        }
    });
}
