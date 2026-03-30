// Dados da tripulação carregados em runtime
let crewData = {};

const MOEDA_TO_DIRTY = 4;
const MINIMUM_COINS = 1000;
const TARGET_COINS = 2000;
const CONTRIBUTION_PERCENT = 20;
const DEFAULT_WASHING_PERCENT = 5;
const WASHING_STORAGE_KEY = 'washingPercent';

let washingPercent = DEFAULT_WASHING_PERCENT;

function clampPercent(value) {
    if (Number.isNaN(value)) return DEFAULT_WASHING_PERCENT;
    return Math.min(100, Math.max(0, value));
}

function loadWashingPercent() {
    const stored = parseFloat(localStorage.getItem(WASHING_STORAGE_KEY));
    washingPercent = clampPercent(stored);
    updateWashingDisplay();
}

function saveWashingPercent() {
    localStorage.setItem(WASHING_STORAGE_KEY, washingPercent);
    updateWashingDisplay();
}

function updateWashingDisplay() {
    const display = document.getElementById('washingPercentDisplay');
    if (display) display.textContent = `${washingPercent}%`;
}

function configureWashing() {
    const input = prompt('Defina a porcentagem de lavagem (0-100):', washingPercent.toString());
    if (input === null) return;

    const parsed = parseFloat(input);
    if (Number.isNaN(parsed)) {
        alert('Digite um número válido entre 0 e 100.');
        return;
    }

    const value = clampPercent(parsed);

    washingPercent = value;
    saveWashingPercent();
    recalculateCrewMoney();
    renderCrew();
}

function recalculateCrewMoney() {
    Object.values(crewData).forEach(member => {
        const recalculated = computeMoneyFromDirty(member.dirtyMoney);
        member.cleanMoney = recalculated.cleanMoney;
        member.contribution = recalculated.contribution;
    });
}

function computeMoneyFromDirty(dirtyMoney) {
    const cleanMoneyBeforeContribution = dirtyMoney * (1 - washingPercent / 100);
    const contribution = cleanMoneyBeforeContribution * (CONTRIBUTION_PERCENT / 100);
    const finalCleanMoney = cleanMoneyBeforeContribution - contribution;
    const washingLoss = dirtyMoney - cleanMoneyBeforeContribution;

    return {
        cleanMoney: finalCleanMoney,
        contribution,
        washingLoss
    };
}

async function loadCrewData() {
    try {
        const csvUrl = 'https://docs.google.com/spreadsheets/d/1nTtm63rHntqpyVMrdbz8J7o1xKL7RdXdp320k_NlP-I/export?format=csv';
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error('Erro ao buscar planilha');
        const csvText = await response.text();

        crewData = {};
        const lines = csvText.trim().split('\n');

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            const name = cols[1];
            const coins = parseFloat(cols[2]) || 0;
            const dirtyMoney = coins * MOEDA_TO_DIRTY;

            const money = computeMoneyFromDirty(dirtyMoney);

            crewData[name] = {
                coins,
                dirtyMoney,
                cleanMoney: money.cleanMoney,
                contribution: money.contribution
            };
        }

        renderCrew();
    } catch (error) {
        alert('Erro ao carregar dados da planilha: ' + error.message);
        crewData = {};
        renderCrew();
    }
}

function saveCrewData() {
    localStorage.setItem('crewData', JSON.stringify(crewData));

    if (confirm('Deseja baixar uma cópia atualizada do arquivo crewData.json?')) {
        exportData();
    }
}

function getStatusClass(drugs) {
    if (drugs >= TARGET_DRUGS) return 'completed';
    if (drugs >= MINIMUM_DRUGS) return 'minimum-reached';
    if (drugs > 0) return 'in-progress';
    return 'not-started';
}

function getStatusIcon(drugs) {
    if (drugs >= TARGET_DRUGS) return '🏆';
    if (drugs >= MINIMUM_DRUGS) return '✅';
    if (drugs > 0) return '⚡';
    return '💤';
}

function getStatusBadge(drugs) {
    if (drugs >= TARGET_DRUGS) return '<span class="status-badge premium">🎁 bateu a meta e ganhou um prêmio especial! 🎁🏴‍☠️</span>';
    if (drugs >= MINIMUM_DRUGS) return '<span class="status-badge minimum">✅ META MÍNIMA ATINGIDA</span>';
    return '';
}

function getStatusClass(coins) {
    if (coins >= TARGET_COINS) return 'completed';
    if (coins >= MINIMUM_COINS) return 'minimum-reached';
    if (coins > 0) return 'in-progress';
    return 'not-started';
}

function getStatusIcon(coins) {
    if (coins >= TARGET_COINS) return '🏆';
    if (coins >= MINIMUM_COINS) return '✅';
    if (coins > 0) return '⚡';
    return '💤';
}

function getStatusBadge(coins) {
    if (coins >= TARGET_COINS) return '<span class="status-badge premium">🎁 bateu a meta e ganhou um prêmio especial! 🎁🏴‍☠️</span>';
    if (coins >= MINIMUM_COINS) return '<span class="status-badge minimum">✅ META MÍNIMA ATINGIDA</span>';
    return '';
}

function formatMoney(amount) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function renderCrew() {
    const crewGrid = document.getElementById('crewGrid');
    const memberSelect = document.getElementById('memberSelect');

    crewGrid.innerHTML = '';
    memberSelect.innerHTML = '<option value="">Selecione um membro...</option>';

    const sortedCrew = Object.entries(crewData).sort((a, b) => b[1].coins - a[1].coins);

    sortedCrew.forEach(([name, data]) => {
        const coinsDisplayed = Math.round(data.coins);
        const statusClass = getStatusClass(coinsDisplayed);
        const statusIcon = getStatusIcon(coinsDisplayed);
        const statusBadge = getStatusBadge(coinsDisplayed);
        const progressPercent = Math.min((coinsDisplayed / TARGET_COINS) * 100, 100);

        const crewMember = document.createElement('div');
        crewMember.className = `crew-member ${statusClass}`;
        crewMember.innerHTML = `
			<div class="member-name">
				<span class="status-icon">${statusIcon}</span>
				${name}
				${statusBadge}
			</div>
			<div class="progress-bar">
				<div class="progress-fill ${statusClass}" style="width: ${progressPercent}%"></div>
				<div class="progress-text">${coinsDisplayed}/${TARGET_COINS} moedas (${Math.round(progressPercent)}%)</div>
			</div>
			<div class="stats">
				<div class="stat">
					<div class="stat-value">${formatMoney(data.dirtyMoney)}</div>
					<div class="stat-label">Dinheiro Sujo</div>
				</div>
				<div class="stat">
					<div class="stat-value">${formatMoney(data.cleanMoney)}</div>
					<div class="stat-label">Dinheiro Limpo</div>
				</div>
				<div class="stat">
					<div class="stat-value">${formatMoney(data.contribution)}</div>
					<div class="stat-label">Contribuição</div>
				</div>
			</div>
		`;
        crewGrid.appendChild(crewMember);

        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        memberSelect.appendChild(option);
    });

    const totalContribution = Object.values(crewData).reduce((sum, member) => sum + member.contribution, 0);
    document.getElementById('treasuryValue').textContent = formatMoney(totalContribution);
}

function openUpdateModal() {
    const modal = document.getElementById('updateModal');
    modal.style.display = 'block';
    resetModalFields();
}

function closeUpdateModal() {
    const modal = document.getElementById('updateModal');
    modal.style.display = 'none';
    resetModalFields();
}

function resetModalFields() {
    document.getElementById('memberSelect').value = '';
    document.getElementById('coinsInput').value = '';
    document.getElementById('dirtyMoneyInput').value = '';
    const calculationResult = document.getElementById('calculationResult');
    if (calculationResult) calculationResult.innerHTML = '';
}

function calculateFromMoney(dirtyMoney) {
    const money = computeMoneyFromDirty(dirtyMoney);
    const coins = dirtyMoney / MOEDA_TO_DIRTY;

    return {
        coins,
        dirtyMoney,
        cleanMoney: money.cleanMoney,
        contribution: money.contribution,
        washingLoss: money.washingLoss
    };
}

function calculateFromCoins(coins) {
    const dirtyMoney = coins * MOEDA_TO_DIRTY;
    const money = computeMoneyFromDirty(dirtyMoney);

    return {
        coins,
        dirtyMoney,
        cleanMoney: money.cleanMoney,
        contribution: money.contribution,
        washingLoss: money.washingLoss
    };
}

function showCalculations(result) {
    const calculationResult = document.getElementById('calculationResult');
    if (!calculationResult) return;

    calculationResult.innerHTML = `
		<div class="calculation-details">
			<h3>Detalhes do Cálculo:</h3>
			<p><strong>Moedas de Guarma:</strong> ${Math.round(result.coins)}</p>
			<p><strong>Dinheiro Sujo (${MOEDA_TO_DIRTY}x):</strong> ${formatMoney(result.dirtyMoney)}</p>
			<p><strong>Lavagem (${washingPercent}%):</strong> ${formatMoney(result.washingLoss)}</p>
			<p><strong>Para o membro (80%):</strong> ${formatMoney(result.cleanMoney)}</p>
			<p><strong>Contribuição (${CONTRIBUTION_PERCENT}%):</strong> ${formatMoney(result.contribution)}</p>
		</div>
	`;
}

function updateProgress() {
    const memberName = document.getElementById('memberSelect').value;
    const coinsInput = document.getElementById('coinsInput').value;
    const moneyInput = document.getElementById('dirtyMoneyInput').value;

    if (!memberName) {
        alert('Selecione um membro da tripulação!');
        return;
    }

    let result;
    if (moneyInput) {
        const dirtyMoney = parseFloat(moneyInput);
        result = calculateFromMoney(dirtyMoney);
    } else if (coinsInput) {
        const coins = parseFloat(coinsInput);
        result = calculateFromCoins(coins);
    } else {
        alert('Digite a quantidade de moedas ou o valor em dinheiro!');
        return;
    }

    if (!crewData[memberName]) {
        crewData[memberName] = {
            coins: 0,
            dirtyMoney: 0,
            cleanMoney: 0,
            contribution: 0
        };
    }

    crewData[memberName].coins += result.coins;
    crewData[memberName].dirtyMoney += result.dirtyMoney;
    crewData[memberName].cleanMoney += result.cleanMoney;
    crewData[memberName].contribution += result.contribution;

    saveCrewData();
    renderCrew();
    closeUpdateModal();

    const totalCoinsRounded = Math.round(crewData[memberName].coins);
    const oldCoinsRounded = Math.round(crewData[memberName].coins - result.coins);

    if (oldCoinsRounded < TARGET_COINS && totalCoinsRounded >= TARGET_COINS) {
        alert(`🏆 ${memberName} conquistou a meta premium! Ganha o prêmio da semana! 🎁🏴‍☠️`);
    } else if (oldCoinsRounded < MINIMUM_COINS && totalCoinsRounded >= MINIMUM_COINS) {
        alert(`✅ ${memberName} atingiu a meta mínima! Continue assim para ganhar o prêmio! 💪`);
    }
}

function resetWeek() {
    if (!confirm('Tem certeza que deseja resetar os dados para uma nova semana?')) return;

    Object.keys(crewData).forEach(name => {
        crewData[name] = {
            coins: 0,
            dirtyMoney: 0,
            cleanMoney: 0,
            contribution: 0
        };
    });

    saveCrewData();
    renderCrew();
    alert('📊 Nova semana iniciada! Que os ventos sejam favoráveis! ⛵');
}

function exportData() {
    const dataToExport = {
        crewData,
        metadata: {
            exportDate: new Date().toISOString(),
            minimumDrugs: MINIMUM_DRUGS,
            targetDrugs: TARGET_DRUGS,
            drugValue: DRUG_VALUE,
            totalContribution: Object.values(crewData).reduce((sum, member) => sum + member.contribution, 0)
        }
    };

    const jsonData = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'crewData.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert('📁 Arquivo crewData.json atualizado e pronto para download!');
}

function importDataFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const importedData = JSON.parse(e.target.result);
            crewData = importedData.crewData || importedData;
            saveCrewData();
            renderCrew();
            alert('Dados importados com sucesso!');
        } catch (error) {
            alert('Erro ao importar arquivo: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function triggerImport() {
    const fileInput = document.getElementById('fileInput');
    fileInput.click();
}

function handleCoinsInput(event) {
    const coins = parseFloat(event.target.value) || 0;
    if (coins > 0) {
        const result = calculateFromCoins(coins);
        document.getElementById('dirtyMoneyInput').value = result.dirtyMoney;
        showCalculations(result);
    } else {
        document.getElementById('dirtyMoneyInput').value = '';
        showCalculations({ coins: 0, dirtyMoney: 0, cleanMoney: 0, contribution: 0, washingLoss: 0 });
        document.getElementById('calculationResult').innerHTML = '';
    }
}

function handleDirtyMoneyInput(event) {
    const dirtyMoney = parseFloat(event.target.value) || 0;
    if (dirtyMoney > 0) {
        const result = calculateFromMoney(dirtyMoney);
        document.getElementById('coinsInput').value = Math.round(result.coins);
        showCalculations(result);
    } else {
        document.getElementById('coinsInput').value = '';
        showCalculations({ coins: 0, dirtyMoney: 0, cleanMoney: 0, contribution: 0, washingLoss: 0 });
        document.getElementById('calculationResult').innerHTML = '';
    }
}

function handleWindowClick(event) {
    const modal = document.getElementById('updateModal');
    if (event.target === modal) {
        closeUpdateModal();
    }
}

function setupEventListeners() {
    const coinsInput = document.getElementById('coinsInput');
    const dirtyMoneyInput = document.getElementById('dirtyMoneyInput');
    const fileInput = document.getElementById('fileInput');

    if (coinsInput) coinsInput.addEventListener('input', handleCoinsInput);
    if (dirtyMoneyInput) dirtyMoneyInput.addEventListener('input', handleDirtyMoneyInput);
    if (fileInput) fileInput.addEventListener('change', importDataFromFile);

    window.addEventListener('click', handleWindowClick);
}

function init() {
    setupEventListeners();
    loadWashingPercent();
    loadCrewData();
}

window.openUpdateModal = openUpdateModal;
window.closeUpdateModal = closeUpdateModal;
window.updateProgress = updateProgress;
window.resetWeek = resetWeek;
window.exportData = exportData;
window.triggerImport = triggerImport;
window.configureWashing = configureWashing;

document.addEventListener('DOMContentLoaded', init);
