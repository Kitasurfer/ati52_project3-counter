// Основные данные
const emotions = {
	happy: 0,
	calm: 0,
	energy: 0,
	stress: 0
};

let emotionHistory = {
	happy: [],
	calm: [],
	energy: [],
	stress: []
};

let diaryEntries = [];
let goals = {
	happy: null,
	calm: null,
	energy: null,
	stress: null
};

let notificationInterval = null;
let realTimeEnabled = false;
let ws;

// Функции для работы с эмоциями
function updateEmotion(emotion, value) {
	emotions[emotion] = Math.max(0, Math.min(10, emotions[emotion] + value));
	document.querySelector(`#${emotion} .level`).textContent = emotions[emotion];
	updateProgressBar(emotion);
	addHistoryEntry();
	showRecommendation();
	updateGoalStatus();
	updateBackground();
	debouncedSaveData();
}

function updateProgressBar(emotion) {
	const progressBar = document.querySelector(`#${emotion} .progress-bar`);
	const level = emotions[emotion];
	progressBar.style.setProperty('--level', level);
	progressBar.querySelector('::before');
	progressBar.style.position = 'relative';
	progressBar.firstElementChild && progressBar.removeChild(progressBar.firstElementChild);
	// Создаём "виртуальный" стиль
	// Но проще напрямую менять ширину псевдоэлемента через inline style невозможно, 
	// поэтому используем поддержку transition через CSS. 
	// Либо можно напрямую менять background-size, но оставим так.

	// Для простоты:
	progressBar.innerHTML = `<div style="background:transparent;width:${level*10}%;height:100%;transition:width 0.3s;"></div>`;
}

function resetEmotions() {
	for (const emotion in emotions) {
			emotions[emotion] = 0;
			document.querySelector(`#${emotion} .level`).textContent = 0;
			updateProgressBar(emotion);
	}
	addHistoryEntry();
	showRecommendation();
	updateGoalStatus();
	updateBackground();
	debouncedSaveData();
}

// Функции для истории эмоций
function addHistoryEntry() {
	const timestamp = new Date().toISOString();
	for (const emotion in emotions) {
			emotionHistory[emotion].push({ timestamp, value: emotions[emotion] });
	}
	debouncedSaveHistory();
}

function showChart() {
	const ctx = document.getElementById('emotionChart').getContext('2d');
	new Chart(ctx, {
			type: 'line',
			data: {
					labels: emotionHistory.happy.map(entry => entry.timestamp),
					datasets: [
							{
									label: 'Счастье',
									data: emotionHistory.happy.map(entry => entry.value),
									borderColor: '#4CAF50',
									fill: false
							},
							{
									label: 'Спокойствие',
									data: emotionHistory.calm.map(entry => entry.value),
									borderColor: '#2196F3',
									fill: false
							},
							{
									label: 'Энергия',
									data: emotionHistory.energy.map(entry => entry.value),
									borderColor: '#FFC107',
									fill: false
							},
							{
									label: 'Стресс',
									data: emotionHistory.stress.map(entry => entry.value),
									borderColor: '#F44336',
									fill: false
							}
					]
			},
			options: {
					responsive: true,
					scales: {
							x: {
									title: { display: true, text: 'Время' },
									ticks: { autoSkip: true, maxTicksLimit: 5 }
							},
							y: {
									title: { display: true, text: 'Уровень эмоции' },
									min: 0,
									max: 10
							}
					}
			}
	});
	document.getElementById('emotionChart').style.display = 'block';
	fadeIn(document.getElementById('emotionChart'));
}

// Рекомендации
function showRecommendation() {
	const maxEmotion = Object.keys(emotions).reduce((a, b) => emotions[a] > emotions[b] ? a : b);
	const recommendation = recommendations[maxEmotion][Math.floor(Math.random() * recommendations[maxEmotion].length)];
	document.getElementById('recommendationText').textContent = recommendation;
}

// Дневник эмоций
function saveDiaryEntry() {
	const entry = document.getElementById('diaryEntry').value.trim();
	if (entry) {
			const timestamp = new Date().toISOString();
			diaryEntries.push({ timestamp, text: entry });
			document.getElementById('diaryEntry').value = '';
			renderDiaryEntries();
			debouncedSaveDiaryData();
	}
}

function renderDiaryEntries() {
	const diaryEntriesDiv = document.getElementById('diaryEntries');
	diaryEntriesDiv.innerHTML = '';
	diaryEntries.forEach(entry => {
			const entryDiv = document.createElement('div');
			entryDiv.classList.add('diary-entry');
			entryDiv.innerHTML = `
					<p>${entry.text}</p>
					<p class="timestamp">${new Date(entry.timestamp).toLocaleString()}</p>
			`;
			diaryEntriesDiv.appendChild(entryDiv);
	});
}

// Цели
function setGoals() {
	for (const emotion in goals) {
			const goalInput = document.getElementById(`${emotion}Goal`);
			const goalValue = parseInt(goalInput.value);
			if (!isNaN(goalValue) && goalValue >= 0 && goalValue <= 10) {
					goals[emotion] = goalValue;
			} else {
					goals[emotion] = null;
					goalInput.value = '';
			}
	}
	updateGoalStatus();
	debouncedSaveGoalData();
}

function updateGoalStatus() {
	const goalStatus = document.getElementById('goalStatus');
	let statusText = '';
	for (const emotion in goals) {
			if (goals[emotion] !== null) {
					const currentLevel = emotions[emotion];
					const difference = goals[emotion] - currentLevel;
					if (difference > 0) {
							statusText += `Для ${emotion}: увеличьте на ${difference}. `;
					} else if (difference < 0) {
							statusText += `Для ${emotion}: уменьшите на ${Math.abs(difference)}. `;
					} else {
							statusText += `Для ${emotion}: цель достигнута. `;
					}
			}
	}
	goalStatus.textContent = statusText || 'Цели не установлены.';
}

// Уведомления
function setNotification() {
	const intervalInput = document.getElementById('notificationInterval');
	const intervalValue = parseInt(intervalInput.value);
	const style = document.getElementById('notificationStyle').value;

	if (!isNaN(intervalValue) && intervalValue > 0) {
			if (notificationInterval) {
					clearInterval(notificationInterval);
			}
			notificationInterval = setInterval(() => {
					if (Notification.permission === 'granted') {
							const notification = new Notification('Эмоциональный счётчик', {
									body: 'Пора обновить свои эмоции!',
									icon: 'icons/icon-192x192.png'
							});
							// При необходимости можно применять стили к notificationElement, 
							// но Notification в браузере не стилизуется напрямую. 
							// Здесь оставим эту возможность логическим placeholder-ом.
					}
			}, intervalValue * 60000);
			alert(`Уведомления установлены. Интервал: ${intervalValue} мин. Стиль: "${style}".`);
	} else {
			alert('Введите корректный интервал (число > 0).');
	}
}

function requestNotificationPermission() {
	if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
			Notification.requestPermission().then(permission => {
					if (permission === 'granted') {
							console.log('Разрешение на уведомления получено.');
					} else {
							console.log('Разрешение не получено.');
					}
			});
	}
}

// Голосовое управление
function handleVoiceCommand(command) {
	const languages = {
			ru: {
					patterns: {
							add: /^(добавь|увеличь) (счастье|спокойствие|энергия|стресс)( на (\d+))?$/i,
							reset: /^сбрось (всё|все эмоции)$/i
					},
					translations: {
							add: 'добавь',
							reset: 'сбрось'
					}
			},
			en: {
					patterns: {
							add: /^(add|increase) (happy|calm|energy|stress)( by (\d+))?$/i,
							reset: /^reset (all|all emotions)$/i
					},
					translations: {
							add: 'add',
							reset: 'reset'
					}
			}
	};

	const lang = navigator.language.split('-')[0];
	const langData = languages[lang] || languages['ru'];

	let match;
	if (command.match(langData.patterns.add)) {
			match = command.match(langData.patterns.add);
			const emotion = match[2].toLowerCase();
			const value = match[4] ? parseInt(match[4]) : 0;
			if (value > 0 && value <= 10) {
					updateEmotion(emotion, value);
					document.getElementById('voiceStatus').textContent = `Уровень ${emotion} увеличен на ${value}.`;
			} else {
					document.getElementById('voiceStatus').textContent = 'Некорректное значение.';
			}
	} else if (command.match(langData.patterns.reset)) {
			resetEmotions();
			document.getElementById('voiceStatus').textContent = 'Все эмоции сброшены.';
	} else {
			document.getElementById('voiceStatus').textContent = 'Команда не распознана.';
	}
}

function startVoiceRecognition() {
	if (!('webkitSpeechRecognition' in window)) {
			document.getElementById('voiceStatus').textContent = 'Голосовое управление не поддерживается.';
			return;
	}

	const recognition = new webkitSpeechRecognition();
	recognition.lang = 'ru-RU';
	recognition.continuous = false;
	recognition.interimResults = false;

	recognition.onstart = () => {
			document.getElementById('voiceStatus').textContent = 'Слушаю...';
	};

	recognition.onresult = event => {
			const command = event.results[0][0].transcript;
			handleVoiceCommand(command);
	};

	recognition.onerror = event => {
			document.getElementById('voiceStatus').textContent = `Ошибка: ${event.error}`;
	};

	recognition.onend = () => {
			document.getElementById('voiceStatus').textContent = 'Голосовое управление завершено.';
	};

	recognition.start();
}

// Соревнования
function shareResults() {
	const balance = calculateEmotionBalance();
	const shareText = `Мой баланс эмоций: ${balance}. Попробуй побить мой рекорд!`;
	if (navigator.share) {
			navigator.share({
					title: 'Эмоциональный счётчик',
					text: shareText,
					url: window.location.href
			}).then(() => {
					console.log('Результаты успешно поделены.');
			}).catch(console.error);
	} else {
			alert('Функция "поделиться" не поддерживается. Скопируйте:\n' + shareText);
	}
}

function calculateEmotionBalance() {
	return Object.values(emotions).reduce((sum, value) => sum + value, 0);
}

function displayFriendResults(friendData) {
	const friendResultsDiv = document.getElementById('friendResults');
	friendResultsDiv.innerHTML = '';
	friendData.forEach(friend => {
			const resultDiv = document.createElement('div');
			resultDiv.classList.add('friend-result');
			resultDiv.textContent = `${friend.name}: ${friend.balance}`;
			friendResultsDiv.appendChild(resultDiv);
	});
}

function connectWebSocket() {
	// Замените на ваш реальный WebSocket сервер
	ws = new WebSocket('wss://your-websocket-server.com');

	ws.onopen = () => {
			document.getElementById('realTimeStatus').textContent = 'Включено';
			console.log('Подключение к WebSocket установлено.');
	};

	ws.onmessage = (event) => {
			const friendData = JSON.parse(event.data);
			displayFriendResults(friendData);
	};

	ws.onerror = console.error;

	ws.onclose = () => {
			document.getElementById('realTimeStatus').textContent = 'Отключено';
			console.log('Соединение WebSocket закрыто.');
	};
}

// Анализ данных
function generateReport() {
	const periodInput = document.getElementById('analysisPeriod');
	const periodDays = parseInt(periodInput.value);
	if (isNaN(periodDays) || periodDays < 1) {
			document.getElementById('report').textContent = 'Введите период > 0.';
			return;
	}

	const now = new Date();
	const startDate = new Date(now);
	startDate.setDate(startDate.getDate() - periodDays);

	const reportData = {};
	for (const emotion in emotionHistory) {
			const relevantEntries = emotionHistory[emotion].filter(entry => {
					const entryDate = new Date(entry.timestamp);
					return entryDate >= startDate && entryDate <= now;
			});
			if (relevantEntries.length > 0) {
					const totalValue = relevantEntries.reduce((sum, entry) => sum + entry.value, 0);
					const averageValue = totalValue / relevantEntries.length;
					reportData[emotion] = {
							average: averageValue.toFixed(2),
							max: Math.max(...relevantEntries.map(e => e.value)),
							min: Math.min(...relevantEntries.map(e => e.value))
					};
			}
	}

	const reportDiv = document.getElementById('report');
	reportDiv.innerHTML = '<h4>Отчёт:</h4>';
	for (const emotion in reportData) {
			const entry = reportData[emotion];
			reportDiv.innerHTML += `
					<p><strong>${emotion.charAt(0).toUpperCase() + emotion.slice(1)}:</strong></p>
					<ul>
							<li>Среднее: ${entry.average}</li>
							<li>Макс: ${entry.max}</li>
							<li>Мин: ${entry.min}</li>
					</ul>
			`;
	}
}

function generateDetailedReport() {
	const periodInput = document.getElementById('analysisPeriod');
	const periodDays = parseInt(periodInput.value);
	if (isNaN(periodDays) || periodDays < 1) {
			document.getElementById('report').textContent = 'Введите период > 0.';
			return;
	}

	const now = new Date();
	const startDate = new Date(now);
	startDate.setDate(startDate.getDate() - periodDays);

	const reportData = {};
	for (const emotion in emotionHistory) {
			const relevantEntries = emotionHistory[emotion].filter(entry => {
					const entryDate = new Date(entry.timestamp);
					return entryDate >= startDate && entryDate <= now;
			});
			if (relevantEntries.length) {
					const totalValue = relevantEntries.reduce((sum, e) => sum + e.value, 0);
					const averageValue = totalValue / relevantEntries.length;
					reportData[emotion] = {
							average: averageValue.toFixed(2),
							max: Math.max(...relevantEntries.map(e => e.value)),
							min: Math.min(...relevantEntries.map(e => e.value)),
							entries: relevantEntries.map(e => ({ timestamp: e.timestamp, value: e.value }))
					};
			}
	}

	const reportDiv = document.getElementById('report');
	reportDiv.innerHTML = '<h4>Детализированный отчёт:</h4>';
	for (const emotion in reportData) {
			const entry = reportData[emotion];
			reportDiv.innerHTML += `
					<p><strong>${emotion.charAt(0).toUpperCase() + emotion.slice(1)}:</strong></p>
					<ul>
							<li>Среднее: ${entry.average}</li>
							<li>Макс: ${entry.max}</li>
							<li>Мин: ${entry.min}</li>
					</ul>
			`;
	}

	const ctx = document.getElementById('detailedChart').getContext('2d');
	const firstEmotion = Object.keys(reportData)[0];
	if (!firstEmotion) return;
	const labels = reportData[firstEmotion].entries.map(e => new Date(e.timestamp).toLocaleString());
	const datasets = Object.keys(reportData).map(emotion => ({
			label: emotion.charAt(0).toUpperCase() + emotion.slice(1),
			data: reportData[emotion].entries.map(e => e.value),
			borderColor: getEmotionColor(emotion),
			fill: false
	}));

	new Chart(ctx, {
			type: 'line',
			data: { labels, datasets },
			options: {
					responsive: true,
					scales: {
							x: { title: { display: true, text: 'Время' } },
							y: { title: { display: true, text: 'Уровень эмоции' }, min: 0, max: 10 }
					},
					plugins: { legend: { position: 'top' } }
			}
	});

	document.getElementById('detailedChart').style.display = 'block';
	fadeIn(document.getElementById('detailedChart'));
}

function getEmotionColor(emotion) {
	switch (emotion) {
			case 'happy': return '#4CAF50';
			case 'calm': return '#2196F3';
			case 'energy': return '#FFC107';
			case 'stress': return '#F44336';
			default: return '#000';
	}
}

// Экспорт/Импорт данных
function exportData() {
	const data = { emotions, emotionHistory, diaryEntries, goals };
	const jsonData = JSON.stringify(data, null, 2);
	const blob = new Blob([jsonData], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'emotion-data.json';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

function importData(event) {
	const file = event.target.files[0];
	if (!file) {
			alert('Выберите файл для импорта.');
			return;
	}

	const reader = new FileReader();
	reader.onload = (e) => {
			try {
					const importedData = JSON.parse(e.target.result);
					Object.assign(emotions, importedData.emotions || {});
					Object.assign(emotionHistory, importedData.emotionHistory || {});
					diaryEntries = importedData.diaryEntries || [];
					Object.assign(goals, importedData.goals || {});

					for (const emotion in emotions) {
							document.querySelector(`#${emotion} .level`).textContent = emotions[emotion];
							updateProgressBar(emotion);
					}
					renderDiaryEntries();
					updateGoalStatus();

					alert('Данные успешно импортированы.');
			} catch (error) {
					alert('Ошибка при импорте данных.');
					console.error(error);
			}
	};
	reader.readAsText(file);
}

// Push-уведомления (PWA)
async function subscribePush() {
	if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
			alert('Push-уведомления не поддерживаются.');
			return;
	}

	const registration = await navigator.serviceWorker.getRegistration();
	if (!registration) {
			alert('Service Worker не зарегистрирован. Обновите страницу.');
			return;
	}

	const subscription = await registration.pushManager.getSubscription();
	if (subscription) {
			alert('Уже подписаны на push-уведомления.');
			return;
	}

	// Замените на Ваш публичный ключ VAPID
	const applicationServerKey = urlBase64ToUint8Array('YOUR_PUBLIC_VAPID_KEY');
	const newSubscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey
	});

	// Отправляем подписку на ваш сервер
	await fetch('/subscribe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(newSubscription)
	});

	alert('Подписка на push-уведомления успешно выполнена.');
}

function urlBase64ToUint8Array(base64String) {
	const padding = '='.repeat((4 - base64String.length % 4) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = window.atob(base64);
	return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

// Мини-игра
function createSmiley() {
	const smiley = document.createElement('div');
	smiley.classList.add('smiley');
	smiley.textContent = '😊';
	smiley.style.left = `${Math.random() * 270}px`;
	smiley.style.top = `${Math.random() * 270}px`;
	return smiley;
}

function startGame() {
	const gameArea = document.getElementById('gameArea');
	const scoreDisplay = document.getElementById('gameScore');
	const difficulty = document.getElementById('gameDifficulty').value;
	let score = 0;

	const difficultySettings = {
			easy: { smileyCount: 10, speed: 1000 },
			medium: { smileyCount: 15, speed: 750 },
			hard: { smileyCount: 20, speed: 500 }
	};

	const { smileyCount, speed } = difficultySettings[difficulty];

	gameArea.innerHTML = '';
	scoreDisplay.textContent = '0';

	for (let i = 0; i < smileyCount; i++) {
			const smiley = createSmiley();
			smiley.addEventListener('click', () => {
					gameArea.removeChild(smiley);
					score++;
					scoreDisplay.textContent = String(score);
					if (score === smileyCount) {
							alert('Поздравляем! Вы собрали все смайлики!');
					}
			});
			gameArea.appendChild(smiley);

			if (difficulty !== 'easy') {
					moveSmiley(smiley, speed);
			}
	}
}

function moveSmiley(smiley, speed) {
	const gameArea = document.getElementById('gameArea');
	const maxX = gameArea.offsetWidth - smiley.offsetWidth;
	const maxY = gameArea.offsetHeight - smiley.offsetHeight;

	function move() {
			const newX = Math.random() * maxX;
			const newY = Math.random() * maxY;
			smiley.style.left = `${newX}px`;
			smiley.style.top = `${newY}px`;
			setTimeout(move, speed);
	}

	move();
}

// Вспомогательные функции
function debounce(func, delay) {
	let timeoutId;
	return function(...args) {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => func.apply(this, args), delay);
	};
}

function fadeIn(element) {
	element.classList.add('fade-in');
}

function updateBackground() {
	const dominantEmotion = Object.keys(emotions).reduce((a, b) => emotions[a] > emotions[b] ? a : b);
	switch (dominantEmotion) {
			case 'happy': document.body.style.backgroundColor = '#E8F5E9'; break;
			case 'calm': document.body.style.backgroundColor = '#E3F2FD'; break;
			case 'energy': document.body.style.backgroundColor = '#FFFDE7'; break;
			case 'stress': document.body.style.backgroundColor = '#FFEBEE'; break;
			default: document.body.style.backgroundColor = '#f0f0f0';
	}
}

function toggleTheme() {
	document.body.classList.toggle('dark-theme');
	const isDark = document.body.classList.contains('dark-theme');
	localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function loadTheme() {
	const savedTheme = localStorage.getItem('theme');
	if (savedTheme === 'dark') {
			document.body.classList.add('dark-theme');
	}
}

// Сохранение и загрузка данных
function saveData() {
	localStorage.setItem('emotions', JSON.stringify(emotions));
}

function loadData() {
	const savedData = localStorage.getItem('emotions');
	if (savedData) {
			Object.assign(emotions, JSON.parse(savedData));
			for (const emotion in emotions) {
					document.querySelector(`#${emotion} .level`).textContent = emotions[emotion];
					updateProgressBar(emotion);
			}
	}
}

function saveHistory() {
	localStorage.setItem('emotionHistory', JSON.stringify(emotionHistory));
}

function loadHistory() {
	const savedHistory = localStorage.getItem('emotionHistory');
	if (savedHistory) {
			emotionHistory = JSON.parse(savedHistory);
	}
}

function saveDiaryData() {
	localStorage.setItem('diaryEntries', JSON.stringify(diaryEntries));
}

function loadDiaryData() {
	const savedData = localStorage.getItem('diaryEntries');
	if (savedData) {
			diaryEntries = JSON.parse(savedData);
			renderDiaryEntries();
	}
}

function saveGoalData() {
	localStorage.setItem('goals', JSON.stringify(goals));
}

function loadGoalData() {
	const savedData = localStorage.getItem('goals');
	if (savedData) {
			Object.assign(goals, JSON.parse(savedData));
			for (const emotion in goals) {
					if (goals[emotion] !== null) {
							document.getElementById(`${emotion}Goal`).value = goals[emotion];
					}
			}
			updateGoalStatus();
	}
}

// Debounce-версии для оптимизации
const debouncedSaveData = debounce(saveData, 1000);
const debouncedSaveHistory = debounce(saveHistory, 1000);
const debouncedSaveDiaryData = debounce(saveDiaryData, 1000);
const debouncedSaveGoalData = debounce(saveGoalData, 1000);

// Обработчики событий
document.querySelectorAll('.increase').forEach(button => {
	button.addEventListener('click', () => {
			const emotion = button.closest('.emotion').id;
			updateEmotion(emotion, 1);
	});
});

document.querySelectorAll('.decrease').forEach(button => {
	button.addEventListener('click', () => {
			const emotion = button.closest('.emotion').id;
			updateEmotion(emotion, -1);
	});
});

document.getElementById('reset').addEventListener('click', resetEmotions);
document.getElementById('showHistory').addEventListener('click', () => { showChart(); });
document.getElementById('saveDiary').addEventListener('click', saveDiaryEntry);
document.getElementById('setGoals').addEventListener('click', setGoals);
document.getElementById('setNotification').addEventListener('click', setNotification);
document.getElementById('startVoice').addEventListener('click', startVoiceRecognition);
document.getElementById('shareResults').addEventListener('click', shareResults);
document.getElementById('toggleRealTime').addEventListener('click', () => {
	if (!realTimeEnabled) {
			connectWebSocket();
			realTimeEnabled = true;
			document.getElementById('toggleRealTime').textContent = 'Отключить реальное время';
	} else {
			if (ws) ws.close();
			realTimeEnabled = false;
			document.getElementById('toggleRealTime').textContent = 'Включить реальное время';
	}
});
document.getElementById('generateReport').addEventListener('click', generateReport);
document.getElementById('generateDetailedReport').addEventListener('click', generateDetailedReport);
document.getElementById('exportData').addEventListener('click', exportData);
document.getElementById('importFile').addEventListener('change', importData);
document.getElementById('subscribePush').addEventListener('click', subscribePush);
document.getElementById('startGame').addEventListener('click', startGame);
document.getElementById('toggleTheme').addEventListener('click', toggleTheme);

// Инициализация при загрузке
loadData();
loadHistory();
loadDiaryData();
loadGoalData();
loadTheme();
requestNotificationPermission();
showRecommendation();
updateBackground();

// Регистрация Service Worker для PWA
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
			navigator.serviceWorker.register('/service-worker.js')
					.then(reg => console.log('Service Worker зарегистрирован:', reg.scope))
					.catch(err => console.error('Ошибка регистрации SW:', err));
	});
}
