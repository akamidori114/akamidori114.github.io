/**
 * セキュアなストレージ管理
 */
const secureStorage = {
    encryptData: function(data) {
        // 簡易的な暗号化（実際の実装ではより強力な暗号化を使用）
        return btoa(JSON.stringify(data));
    },

    decryptData: function(encrypted) {
        try {
            return JSON.parse(atob(encrypted));
        } catch (e) {
            console.error('データの復号化に失敗しました');
            return null;
        }
    },

    setItem: function(key, value) {
        try {
            const encrypted = this.encryptData(value);
            localStorage.setItem(key, encrypted);
            return true;
        } catch (e) {
            console.error('データの保存に失敗しました:', e);
            return false;
        }
    },

    getItem: function(key) {
        try {
            const encrypted = localStorage.getItem(key);
            if (!encrypted) return null;
            return this.decryptData(encrypted);
        } catch (e) {
            console.error('データの取得に失敗しました:', e);
            return null;
        }
    }
};

/**
 * データ整合性チェック
 */
const dataValidator = {
    validateStudyRecord: function(record) {
        if (!record) throw new Error('記録が空です');
        
        // 学習時間の検証
        if (!record.hours || 
            typeof record.hours !== 'number' || 
            record.hours < 0.5 || 
            record.hours > 24) {
            throw new Error('不正な学習時間です');
        }

        // タグの検証
        if (record.tags && !Array.isArray(record.tags)) {
            throw new Error('不正なタグ形式です');
        }

        // メモの検証
        if (record.memo && typeof record.memo !== 'string') {
            throw new Error('不正なメモ形式です');
        }

        return true;
    },

    validateTags: function(tags) {
        if (!Array.isArray(tags)) throw new Error('不正なタグリスト形式です');
        
        tags.forEach(tag => {
            if (typeof tag !== 'string') throw new Error('不正なタグ形式です');
            if (tag.length > 20) throw new Error('タグが長すぎます');
            if (tag.length === 0) throw new Error('空のタグは許可されていません');
        });

        return true;
    }
};

/**
 * エラーハンドリング
 */
const errorHandler = {
    showError: function(message) {
        alert('エラー: ' + message);
    },

    logError: function(error, context) {
        console.error(`エラー [${context}]:`, error);
    }
};

/**
 * グローバル変数の初期化
 */
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let studyRecords = secureStorage.getItem('studyRecords') || {};
let registeredTags = secureStorage.getItem('registeredTags') || [];
let tagDistributionChart = null;

/**
 * 初期化処理
 */
document.addEventListener('DOMContentLoaded', () => {
    setupDateSelectors();
    setupMonthNavigation();
    initializeTagManagement();
    setupStudyHoursOptions();
    generateCalendar();
});

/**
 * 学習時間選択肢の設定（0.5時間から24時間まで、0.5刻み）
 */
function setupStudyHoursOptions() {
    const studyHours = document.getElementById('studyHours');
    for (let i = 0.5; i <= 24; i += 0.5) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i}時間`;
        studyHours.appendChild(option);
    }
}

/**
 * カレンダー生成
 */
function generateCalendar() {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startingDay = firstDay.getDay();
    const monthLength = lastDay.getDate();

    updateMonthDisplay();
    const calendarBody = document.getElementById('calendar');
    calendarBody.innerHTML = '';

    let day = 1;
    for (let i = 0; i < 42; i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day');
        
        if (i >= startingDay && day <= monthLength) {
            createDayCell(dayElement, day);
            day++;
        }
        
        calendarBody.appendChild(dayElement);
    }
    
    updateMonthlySummary();
}

/**
 * 日付セルの作成
 */
function createDayCell(dayElement, day) {
    dayElement.textContent = day;
    const dateStr = formatDate(day);
    
    dayElement.addEventListener('click', () => showStudyForm(dateStr));
    
    if (studyRecords[dateStr]) {
        addStudyRecordToCell(dayElement, dateStr);
    }
}

/**
 * 学習記録をセルに追加
 */
function addStudyRecordToCell(dayElement, dateStr) {
    dayElement.classList.add('has-record');
    
    const hoursDiv = document.createElement('div');
    hoursDiv.textContent = `${studyRecords[dateStr].hours}時間`;
    hoursDiv.classList.add('study-hours');
    dayElement.appendChild(hoursDiv);
    
    if (studyRecords[dateStr].memo) {
        const memoDiv = document.createElement('div');
        memoDiv.textContent = studyRecords[dateStr].memo.slice(0, 15) + 
            (studyRecords[dateStr].memo.length > 15 ? '...' : '');
        memoDiv.classList.add('study-memo');
        dayElement.appendChild(memoDiv);
    }

    if (studyRecords[dateStr].tags && studyRecords[dateStr].tags.length > 0) {
        const tagsDiv = document.createElement('div');
        tagsDiv.classList.add('calendar-tags');
        studyRecords[dateStr].tags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.classList.add('calendar-tag');
            tagSpan.textContent = tag;
            tagsDiv.appendChild(tagSpan);
        });
        dayElement.appendChild(tagsDiv);
    }
}

/**
 * タグ管理機能
 */
function initializeTagManagement() {
    const newTagInput = document.getElementById('newTagInput');
    const addNewTagButton = document.getElementById('addNewTag');
    
    displayRegisteredTags();
    
    addNewTagButton.addEventListener('click', () => {
        const tagText = newTagInput.value.trim();
        if (tagText && !registeredTags.includes(tagText)) {
            registeredTags.push(tagText);
            localStorage.setItem('registeredTags', JSON.stringify(registeredTags));
            displayRegisteredTags();
            newTagInput.value = '';
        }
    });
}

/**
 * 登録済みタグの表示
 */
function displayRegisteredTags() {
    const container = document.getElementById('registeredTags');
    container.innerHTML = '';
    
    registeredTags.forEach(tag => {
        const tagElement = document.createElement('div');
        tagElement.classList.add('registered-tag');
        tagElement.innerHTML = `
            ${tag}
            <span class="tag-delete">&times;</span>
        `;
        
        tagElement.querySelector('.tag-delete').addEventListener('click', () => {
            if (confirm(`タグ「${tag}」を削除してもよろしいですか？`)) {
                registeredTags = registeredTags.filter(t => t !== tag);
                localStorage.setItem('registeredTags', JSON.stringify(registeredTags));
                displayRegisteredTags();
            }
        });
        
        container.appendChild(tagElement);
    });
}

/**
 * 学習記録フォームの表示
 */
function showStudyForm(dateStr) {
    const modal = document.getElementById('studyFormModal');
    const selectedDate = document.getElementById('selectedDate');
    const studyHours = document.getElementById('studyHours');
    const studyMemo = document.getElementById('studyMemo');
    const tagContainer = document.getElementById('tagContainer');
    const deleteButton = document.getElementById('deleteRecord');
    
    selectedDate.textContent = `${dateStr}の学習記録`;
    tagContainer.innerHTML = '';
    
    // タグ選択肢の表示
    registeredTags.forEach(tag => {
        const tagOption = document.createElement('div');
        tagOption.classList.add('tag-option');
        tagOption.textContent = tag;
        
        if (studyRecords[dateStr]?.tags?.includes(tag)) {
            tagOption.classList.add('selected');
        }
        
        tagOption.addEventListener('click', () => {
            tagOption.classList.toggle('selected');
        });
        
        tagContainer.appendChild(tagOption);
    });
    
    // 既存の記録がある場合は表示
    if (studyRecords[dateStr]) {
        studyHours.value = studyRecords[dateStr].hours;
        studyMemo.value = studyRecords[dateStr].memo || '';
        deleteButton.style.display = 'block';
    } else {
        studyHours.value = '';
        studyMemo.value = '';
        deleteButton.style.display = 'none';
    }
    
    modal.style.display = 'block';
    setupFormEventListeners(modal, dateStr);
}

/**
 * 学習記録の削除
 */
function deleteStudyRecord(modal, dateStr) {
    if (confirm('この日の記録を削除してもよろしいですか？')) {
        delete studyRecords[dateStr];
        localStorage.setItem('studyRecords', JSON.stringify(studyRecords));
        modal.style.display = 'none';
        generateCalendar();
    }
}

/**
 * フォームのイベントリスナー設定
 */
function setupFormEventListeners(modal, dateStr) {
    // 保存ボタン
    document.getElementById('saveRecord').onclick = () => {
        saveStudyRecord(modal, dateStr);
    };
    
    // 削除ボタン
    document.getElementById('deleteRecord').onclick = () => {
        deleteStudyRecord(modal, dateStr);
    };
    
    // 閉じるボタン
    document.getElementById('closeModal').onclick = () => {
        modal.style.display = 'none';
    };
    
    // モーダル外クリックで閉じる
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

/**
 * 学習記録の保存
 */
function saveStudyRecord(modal, dateStr) {
    try {
        const studyHours = document.getElementById('studyHours');
        const studyMemo = document.getElementById('studyMemo');
        const selectedTags = Array.from(document.querySelectorAll('.tag-option.selected'))
            .map(tag => tag.textContent);

        if (!studyHours.value) {
            throw new Error('学習時間を選択してください');
        }

        const record = {
            hours: parseFloat(studyHours.value),
            memo: studyMemo.value,
            tags: selectedTags
        };

        // データ検証
        dataValidator.validateStudyRecord(record);
        
        studyRecords[dateStr] = record;
        
        // 暗号化して保存
        if (!secureStorage.setItem('studyRecords', studyRecords)) {
            throw new Error('データの保存に失敗しました');
        }

        modal.style.display = 'none';
        generateCalendar();

    } catch (error) {
        errorHandler.logError(error, 'saveStudyRecord');
        errorHandler.showError(error.message);
    }
}

/**
 * 月間集計の更新
 */
function updateMonthlySummary() {
    let totalHours = 0;
    let studyDays = 0;
    let tagHours = {};
    
    // タグごとの学習時間を集計
    for (let day = 1; day <= 31; day++) {
        const dateStr = formatDate(day);
        if (studyRecords[dateStr]) {
            const hours = parseFloat(studyRecords[dateStr].hours);
            totalHours += hours;
            studyDays++;
            
            // タグごとの時間を集計
            if (studyRecords[dateStr].tags && studyRecords[dateStr].tags.length > 0) {
                studyRecords[dateStr].tags.forEach(tag => {
                    // タグごとの時間を均等に分配
                    const hourPerTag = hours / studyRecords[dateStr].tags.length;
                    tagHours[tag] = (tagHours[tag] || 0) + hourPerTag;
                });
            } else {
                // タグなしの場合
                tagHours['未分類'] = (tagHours['未分類'] || 0) + hours;
            }
        }
    }
    
    // 基本的な集計情報を更新
    document.getElementById('monthlyTotalHours').textContent = totalHours.toFixed(1);
    document.getElementById('monthlyStudyDays').textContent = studyDays;
    
    // グラフの更新
    updateTagDistributionChart(tagHours);
}

/**
 * タグ分布グラフの更新
 */
function updateTagDistributionChart(tagHours) {
    const ctx = document.getElementById('tagDistributionChart');
    
    // データの準備
    const labels = Object.keys(tagHours);
    const data = Object.values(tagHours);
    
    // 色の生成
    const colors = generateColors(labels.length);
    
    // 既存のチャートを破棄
    if (tagDistributionChart) {
        tagDistributionChart.destroy();
    }
    
    // 新しいチャートを作成
    tagDistributionChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw.toFixed(1);
                            const percentage = (context.raw / data.reduce((a, b) => a + b, 0) * 100).toFixed(1);
                            return `${label}: ${value}時間 (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * グラフの色を生成する関数
 */
function generateColors(count) {
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF9F40'
    ];
    
    // 色が足りない場合は繰り返し使用
    while (colors.length < count) {
        colors.push(...colors.slice(0, count - colors.length));
    }
    
    return colors.slice(0, count);
}

/**
 * ユーティリティ関数
 */
function formatDate(day) {
    return `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function updateMonthDisplay() {
    document.getElementById('yearSelect').value = currentYear;
    document.getElementById('monthSelect').value = currentMonth;
}

function setupMonthNavigation() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        generateCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        generateCalendar();
    });
}

function setupDateSelectors() {
    const yearSelect = document.getElementById('yearSelect');
    const monthSelect = document.getElementById('monthSelect');
    
    // 年の選択肢を設定
    const currentYearJS = new Date().getFullYear();
    for (let year = currentYearJS - 5; year <= currentYearJS + 5; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}年`;
        yearSelect.appendChild(option);
    }
    yearSelect.value = currentYear;
    
    // 月の選択肢を設定
    const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", 
                       "7月", "8月", "9月", "10月", "11月", "12月"];
    monthNames.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = month;
        monthSelect.appendChild(option);
    });
    monthSelect.value = currentMonth;
    
    // イベントリスナーの設定
    yearSelect.addEventListener('change', () => {
        currentYear = parseInt(yearSelect.value);
        generateCalendar();
    });
    
    monthSelect.addEventListener('change', () => {
        currentMonth = parseInt(monthSelect.value);
        generateCalendar();
    });
}