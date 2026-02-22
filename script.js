document.addEventListener('DOMContentLoaded', () => {
    // --- LOGIN LOGIC ---
    const app = document.getElementById('app');
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password-input');
    const loginError = document.getElementById('login-error');
    const loginCard = document.querySelector('.login-card');

    const handleLogin = (e) => {
        if (e) e.preventDefault();
        
        loginError.textContent = '';
        loginCard.classList.remove('shake');

        if (passwordInput.value === 'daily') {
            sessionStorage.setItem('isLoggedIn', 'true');
            loginOverlay.style.opacity = '0';
            loginOverlay.style.visibility = 'hidden';
            app.classList.remove('hidden');
        } else {
            loginError.textContent = 'Incorrect password. Please try again.';
            loginCard.classList.add('shake');
            passwordInput.value = '';
        }
    };

    const checkLogin = () => {
        if (sessionStorage.getItem('isLoggedIn') === 'true') {
            loginOverlay.classList.add('hidden');
            app.classList.remove('hidden');
        } else {
            loginOverlay.classList.remove('hidden');
            app.classList.add('hidden');
        }
    };

    loginForm.addEventListener('submit', handleLogin);
    checkLogin();

    // --- DARK MODE LOGIC ---
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    if (localStorage.theme === 'dark') {
        htmlElement.classList.add('dark');
    } else {
        htmlElement.classList.remove('dark');
    }

    themeToggle.addEventListener('click', () => {
        if (htmlElement.classList.contains('dark')) {
            htmlElement.classList.remove('dark');
            localStorage.theme = 'light';
        } else {
            htmlElement.classList.add('dark');
            localStorage.theme = 'dark';
        }
    });

    // --- STATE MANAGEMENT & CONSTANTS ---
    let dataPeriod1 = [];
    let dataPeriod2 = [];
    let churnUserDetails = [];
    let filteredData = [];
    let dateRange1 = null;
    let dateRange2 = null;
    let period2Label = null;
    let charts = {};
    let scrollHintCounter = 0;
    let reportData = {};
    const accountExecutives = ['Chimezie Ezimoha', 'Waheed Ayinla', 'Abraham Ohworieha', 'Semilogo (for phone call)'];

    // --- DOM ELEMENTS ---
    const apiUrlInput = document.getElementById('api-url');
    const fetchApiBtn = document.getElementById('fetch-api-data');
    const cohortToggle = document.getElementById('cohort-toggle');
    const cohortInputs = document.getElementById('cohort-inputs');
    const apiStart1Input = document.getElementById('api-start-1');
    const apiEnd1Input = document.getElementById('api-end-1');
    const apiStart2Input = document.getElementById('api-start-2');
    const apiEnd2Input = document.getElementById('api-end-2');
    const apiPresets1 = document.getElementById('api-presets-1');
    const apiPresets2 = document.getElementById('api-presets-2');
    const churnInputs = document.getElementById('churn-inputs');
    const apiStartChurnInput = document.getElementById('api-start-churn');
    const apiEndChurnInput = document.getElementById('api-end-churn');
    const apiPresetsChurn = document.getElementById('api-presets-churn');
    const dateDisplay1 = document.getElementById('date-display-1');
    const dateDisplay2 = document.getElementById('date-display-2');
    const dateDisplayChurn = document.getElementById('date-display-churn');
    const dashboard = document.getElementById('dashboard');
    const statusContainer = document.getElementById('status-container');
    const statusMessage = document.getElementById('status-message');
    const loader = document.getElementById('loader');
    const loadingOverlay = document.getElementById('loading-overlay');
    const dataTable = document.getElementById('data-table');
    const tableTitle = document.getElementById('table-title');
    const tableScrollContainer = document.getElementById('table-scroll-container');
    const minTransInput = document.getElementById('min-trans');
    const maxTransInput = document.getElementById('max-trans');
    const searchInput = document.getElementById('search-input');
    const searchColumnSelect = document.getElementById('search-column-select');
    const exportBtn = document.getElementById('export-csv');
    const noResultsEl = document.getElementById('no-results');
    const tableDescription = document.getElementById('table-description');
    const reportInfoIcon = document.getElementById('report-info-icon');
    const reportModalOverlay = document.getElementById('report-modal-overlay');
    const reportModal = document.getElementById('report-modal');
    const reportContent = document.getElementById('report-content');
    const copyReportBtn = document.getElementById('copy-report-btn');
    const closeReportBtn = document.getElementById('close-report-btn');
    const skuToggle = document.getElementById('sku-toggle');
    const stateToggle = document.getElementById('state-toggle');
    const storeTypeToggle = document.getElementById('store-type-toggle');
    const lastNameToggle = document.getElementById('last-name-toggle');

    // --- HELPER FUNCTIONS ---
    const showStatus = (message, showLoader = true) => {
        statusContainer.classList.remove('hidden');
        statusMessage.textContent = message;
        loader.style.display = showLoader ? 'block' : 'none';
        dashboard.classList.add('hidden');
    };

    const hideStatus = () => {
        statusContainer.classList.add('hidden');
    };

    const showError = (message) => {
        showStatus(message, false);
        statusMessage.classList.add('text-red-600');
    };

    const resetError = () => {
        statusMessage.classList.remove('text-red-600');
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString;
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatPeriodText = (range) => {
        if (!range || !range.start || range.start === 'File') return 'the selected file';

        const startDate = new Date(range.start + 'T00:00:00');
        const endDate = new Date(range.end + 'T00:00:00');
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();

        if (startYear !== endYear) {
            return `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
        } else {
            return `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
        }
    };

    // RESTORED ORIGINAL: Uses UTC behavior to match original dashboard logic exactly
    const toYYYYMMDD = (d) => d.toISOString().split('T')[0];

    const truncateText = (text, wordLimit = 3) => {
        if (!text) return 'N/A';
        const words = text.split(' ');
        if (words.length > wordLimit) {
            return words.slice(0, wordLimit).join(' ') + ' ...';
        }
        return text;
    };
    
    const getDurationString = (startDateStr, endDateStr, isPriorPeriod = false) => {
        const start = new Date(startDateStr + 'T00:00:00');
        const end = new Date(endDateStr + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const isRecent = end.getTime() === today.getTime() || end.getTime() === today.getTime() - (1000 * 60 * 60 * 24);

        if (isRecent && !isPriorPeriod) {
            return `the last ${diffDays} days`;
        }
        
        if (isPriorPeriod) {
            return `the prior ${diffDays}-day period`;
        }
        
        return `the ${diffDays}-day period`;
    };

    const resetDashboard = () => {
        dashboard.classList.add('hidden');
        hideStatus();

        dataPeriod1 = [];
        dataPeriod2 = [];
        churnUserDetails = [];
        filteredData = [];
        dateRange1 = null;
        dateRange2 = null;
        period2Label = null;
        reportData = {};
        reportInfoIcon.classList.add('hidden');
        hideReportModal();

        destroyCharts();

        document.getElementById('retention-rate').textContent = '-';
        document.getElementById('retained-users').textContent = '-';
        document.getElementById('new-users').textContent = '-';
        document.getElementById('churned-users').textContent = '-';
        document.getElementById('total-users').textContent = '-';
        ['retained-when', 'new-when', 'churned-when', 'total-when'].forEach(id => {
            document.getElementById(id).textContent = '';
        });

        document.body.classList.remove('fullscreen-active');
        ['retained-popup', 'new-popup', 'churned-popup', 'total-popup'].forEach(id => {
            const popup = document.getElementById(id);
            if (popup) {
                popup.innerHTML = '';
                popup.classList.remove('expanded', 'fullscreen');
            }
        });

        dataTable.innerHTML = '';
        noResultsEl.classList.add('hidden');
        tableTitle.textContent = 'User Data';
        tableDescription.textContent = 'Select a period to see user data.';

        dateDisplay1.innerHTML = '';
        dateDisplay2.innerHTML = '';
        dateDisplayChurn.innerHTML = '';
    };

    const updateDateDisplay = (startInput, endInput, displayContainer) => {
        const startVal = startInput.value;
        const endVal = endInput.value;

        if (startVal && endVal && new Date(startVal) <= new Date(endVal)) {
            const startDate = new Date(startVal + 'T00:00:00');
            const endDate = new Date(endVal + 'T00:00:00');
            let startText, endText;
            const startYear = startDate.getFullYear();
            const endYear = endDate.getFullYear();

            if (startYear !== endYear) {
                startText = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                endText = endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            } else {
                startText = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
                endText = endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            }

            displayContainer.innerHTML = `
                <div class="date-display-container">
                    <span class="date-display-text">${startText}</span>
                    <div class="date-display-line"></div>
                    <span class="date-display-text">${endText}</span>
                </div>`;
        } else {
            displayContainer.innerHTML = '';
        }
    };

    const parseAndProcessData = (csvText, period) => {
        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const validRows = results.data.filter(row => {
                         const phone = row['Phone Number'];
                         const name = row['First Name'];
                         
                         if (!phone || typeof phone !== 'string' || phone.trim() === '') return false;
                         if (name && /^(grand )?total$/i.test(name.trim())) return false;
                         
                         return true;
                    });

                    const parsedData = validRows.map(row => ({
                        ...row,
                        'Transaction Count': parseInt(row['Transaction Count'], 10) || 0,
                        'SKU Count': parseInt(row['SKU Count'], 10) || 0,
                        'Total Amount': parseFloat(row['Total Amount']) || 0,
                        'State': row['State'] || 'N/A',
                        'Store Type': row['Store Type'] || 'N/A'
                    }));

                    if (period === 1) dataPeriod1 = parsedData;
                    else if (period === 2) dataPeriod2 = parsedData;
                    else if (period === 'churn') churnUserDetails = parsedData;
                    
                    resolve(parsedData); 
                },
                error: (error) => reject(new Error(`CSV Parsing Error: ${error.message}`))
            });
        });
    };

    const handleApiFetch = async () => {
        let baseUrl = apiUrlInput.value.trim();
        let start1, end1, start2, end2;

        resetError();

        if (cohortToggle.checked) {
            start1 = apiStart1Input.value; end1 = apiEnd1Input.value;
            start2 = apiStart2Input.value; end2 = apiEnd2Input.value;
            if (!baseUrl || !start1 || !end1 || !start2 || !end2) {
                alert('Please fill in the Base API URL and select all dates for both periods.');
                return;
            }
        } else {
            const churnStart = apiStartChurnInput.value, churnEnd = apiEndChurnInput.value;
            if (!baseUrl || !churnStart || !churnEnd) {
                alert('Please fill in the Base API URL and select an observation date range.');
                return;
            }
            const churnStartDate = new Date(churnStart + 'T00:00:00');
            const period1EndDate = new Date(churnStartDate);
            period1EndDate.setDate(period1EndDate.getDate() - 1);
            const period1StartDate = new Date(churnStartDate);
            period1StartDate.setDate(period1StartDate.getDate() - 30);
            start1 = toYYYYMMDD(period1StartDate);
            end1 = toYYYYMMDD(period1EndDate);
            start2 = churnStart;
            end2 = churnEnd;
        }

        loadingOverlay.classList.remove('hidden'); 
        showStatus('Fetching data from API...');
        dateRange1 = { start: start1, end: end1 };
        dateRange2 = { start: start2, end: end2 };
        
        try {
            const retentionEndpoint = baseUrl.replace('/churn', '/retention');
            const url1 = `${retentionEndpoint}?download=retained-user-stats&startDate=${start1}&endDate=${end1}`;
            const url2 = `${retentionEndpoint}?download=retained-user-stats&startDate=${start2}&endDate=${end2}`;
            const churnUrl = `${retentionEndpoint}?download=churned-users&startDate=${start1}&endDate=${end1}`;
        
            const [response1, response2, churnResponse] = await Promise.all([fetch(url1), fetch(url2), fetch(churnUrl)]);

            if (!response1.ok) throw new Error(`API error for Period 1: ${response1.status} ${response1.statusText}`);
            if (!response2.ok) throw new Error(`API error for Period 2: ${response2.status} ${response2.statusText}`);
            if (!churnResponse.ok) throw new Error(`API error for Churn Data: ${churnResponse.status} ${churnResponse.statusText}`);

            showStatus('Parsing data...');
            const [csvText1, csvText2, churnCsvText] = await Promise.all([response1.text(), response2.text(), churnResponse.text()]);

            await Promise.all([
                parseAndProcessData(csvText1, 1),
                parseAndProcessData(csvText2, 2),
                parseAndProcessData(churnCsvText, 'churn')
            ]);
            
            await analyzeData();

            hideStatus();
            dashboard.classList.remove('hidden');
            dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            console.error(error);
            showError(`Failed to fetch or process API data. Error: ${error.message}`);
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    };

    const analyzeData = async () => {
        showStatus('Analyzing data...');
        
        const usersP1PhoneNumbers = new Set(dataPeriod1.map(u => u['Phone Number']));
        const usersP2PhoneNumbers = new Set(dataPeriod2.map(u => u['Phone Number']));
        
        const retainedUsersSet = new Set([...usersP1PhoneNumbers].filter(phone => usersP2PhoneNumbers.has(phone)));
        const newUsersSet = new Set([...usersP2PhoneNumbers].filter(phone => !usersP1PhoneNumbers.has(phone)));
        const churnedPhoneNumbers = new Set([...usersP1PhoneNumbers].filter(phone => !usersP2PhoneNumbers.has(phone)));
        
        const retainedData = dataPeriod2.filter(u => retainedUsersSet.has(u['Phone Number']));
        const newData = dataPeriod2.filter(u => newUsersSet.has(u['Phone Number']));
        
        const churnDetailsMap = new Map(churnUserDetails.map(u => [u['Phone Number'], u]));
        
        const churnedData = Array.from(churnedPhoneNumbers).map(phone => {
            const p1Data = dataPeriod1.find(u => u['Phone Number'] === phone);
            const details = churnDetailsMap.get(phone);
            return {
                ...p1Data, 
                ...details, 
                'Created Date': details ? details['Created Date'] : (p1Data ? p1Data['Created Date'] : null),
                'Store Name': details ? details['Store Name'] : (p1Data ? p1Data['Store Name'] : 'N/A'),
                'Store Address': details ? details['Store Address'] : (p1Data ? p1Data['Store Address'] : 'N/A'),
                'LGA': details ? details['LGA'] : (p1Data ? p1Data['LGA'] : 'N/A'),
            };
        });
        
        const retentionRate = usersP1PhoneNumbers.size > 0 ? (retainedUsersSet.size / usersP1PhoneNumbers.size * 100).toFixed(1) : 0;
        
        const highFreqCount = dataPeriod2.filter(u => (u['Transaction Count'] || 0) > 10).length;

        document.getElementById('retention-rate').textContent = `${retentionRate}%`;
        document.getElementById('retained-users').textContent = retainedUsersSet.size;
        document.getElementById('new-users').textContent = newUsersSet.size;
        document.getElementById('churned-users').textContent = churnedData.length;
        document.getElementById('total-users').textContent = usersP2PhoneNumbers.size;

        const period1Text = formatPeriodText(dateRange1);
        const period2Text = formatPeriodText(dateRange2);
        
        document.getElementById('retained-when').textContent = `from ${period2Text}`;
        document.getElementById('new-when').textContent = `from ${period2Text}`;
        document.getElementById('churned-when').textContent = `from ${period1Text}`;
        document.getElementById('total-when').textContent = `from ${period2Text}`;

        createPopupTable('retained-popup', 'Retained Users', retainedData);
        createPopupTable('new-popup', 'New Users', newData);
        createPopupTable('churned-popup', 'Churned Users', churnedData);
        createPopupTable('total-popup', 'Total Active Users', dataPeriod2);

        tableTitle.textContent = `Active Users: ${period2Text}`;
        tableDescription.textContent = `Showing ${dataPeriod2.length} total users in this period.`;

        // Restored canvas clear checks
        if (dateRange2 && dateRange2.end && dateRange2.end !== 'Data') {
             await fetchAndRender90DayCharts(dateRange2.end);
        } else {
            destroyCharts();
            const userCtx = document.getElementById('user-chart').getContext('2d');
            userCtx.clearRect(0, 0, userCtx.canvas.width, userCtx.canvas.height);
            userCtx.font = "16px Inter";
            userCtx.fillStyle = "#64748b";
            userCtx.textAlign = "center";
            userCtx.fillText("90-day trend not available.", userCtx.canvas.width / 2, 50);

            const transCtx = document.getElementById('transaction-chart').getContext('2d');
            transCtx.clearRect(0, 0, transCtx.canvas.width, transCtx.canvas.height);
            transCtx.font = "16px Inter";
            transCtx.fillStyle = "#64748b";
            transCtx.textAlign = "center";
            transCtx.fillText("90-day trend not available.", transCtx.canvas.width / 2, 50);
        }
        
        reportData = {
            retentionRate: retentionRate,
            newUsers: newUsersSet.size,
            churnedUsers: churnedData.length,
            totalActiveUsers: usersP2PhoneNumbers.size,
            highFreqCount: highFreqCount, 
            period1Text: period1Text,
            period2Text: period2Text,
            periodLabel: period2Label,
            isApiMode: true,
            apiParams: {
                start1: dateRange1 ? dateRange1.start : null,
                end1: dateRange1 ? dateRange1.end : null,
                start2: dateRange2 ? dateRange2.start : null,
                end2: dateRange2 ? dateRange2.end : null,
                isCohort: cohortToggle.checked
            }
        };
        reportInfoIcon.classList.remove('hidden');

        applyFilters();
    };

    const showReportModal = () => {
        if (Object.keys(reportData).length === 0) return;

        const timestamp = new Date().toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
        
        let summaryText;

        if (reportData.isApiMode) {
            const p2DateRange = formatPeriodText({start: reportData.apiParams.start2, end: reportData.apiParams.end2});
            const durationP2 = (reportData.periodLabel || getDurationString(reportData.apiParams.start2, reportData.apiParams.end2)).toLowerCase();
            const durationP1 = getDurationString(reportData.apiParams.start1, reportData.apiParams.end1, true);
            
            const analysisUrl = `${window.location.href.split('?')[0]}?autorun=true&isCohort=${reportData.apiParams.isCohort}&start1=${reportData.apiParams.start1}&end1=${reportData.apiParams.end1}&start2=${reportData.apiParams.start2}&end2=${reportData.apiParams.end2}`;

            summaryText = `Report Summary for ${durationP2} (${p2DateRange})
(Auto-generated with Pika-RS)

Date & Time Stamp of Generated Report: ${timestamp}

- Retention: ${reportData.retentionRate}% of users from ${durationP1} were still active in ${durationP2}.

- New Users: ${reportData.newUsers} retailers were newly active. These are users who were present in ${durationP2} but not in ${durationP1}.

- Churn: ${reportData.churnedUsers} users from ${durationP1} did not return. These users were active previously but were inactive during ${durationP2}.

- Total Active Users: In total, there were ${reportData.totalActiveUsers} active users during ${durationP2}.

- Transaction Frequency: Of the ${reportData.totalActiveUsers} total active users in ${durationP2}, only ${reportData.highFreqCount} recorded sales more than 10 times in total.

Verification Link:
${analysisUrl}`;

        }
        
        reportContent.textContent = summaryText;
        reportModal.classList.remove('hidden');
        reportModalOverlay.classList.remove('hidden');
    };

    const hideReportModal = () => {
        reportModal.classList.add('hidden');
        reportModalOverlay.classList.add('hidden');
    };

    const copyReport = () => {
        navigator.clipboard.writeText(reportContent.textContent).then(() => {
            copyReportBtn.textContent = 'Copied!';
            copyReportBtn.classList.add('bg-green-600', 'hover:bg-green-700');
            copyReportBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            setTimeout(() => {
                copyReportBtn.textContent = 'Copy Report';
                copyReportBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                copyReportBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy report: ', err);
            alert('Failed to copy report.');
        });
    };

    const createPopupTable = (popupId, title, data) => {
        const container = document.getElementById(popupId);
        container.innerHTML = '';
        container.classList.remove('expanded');
        if (!data || data.length === 0) {
            container.innerHTML = `<p class="text-xs text-slate-500 p-4 text-center">No users to show.</p>`;
            return;
        }

        const tableHTML = `
            <div class="popup-table-container">
                <table class="popup-table">
                    <thead><tr><th>Name</th><th>Transactions</th><th>Phone</th></tr></thead>
                    <tbody>${data.slice(0, 10).map(row => `<tr><td>${row['First Name']} ${row['Last Name']}</td><td style="text-align: center;">${row['Transaction Count'] !== undefined ? row['Transaction Count'] : 'N/A'}</td><td>${row['Phone Number']}</td></tr>`).join('')}</tbody>
                </table>
            </div>`;

        const footer = document.createElement('div');
        footer.className = 'popup-footer';

        const remainingText = document.createElement('span');
        remainingText.textContent = data.length > 10 ? `...and ${data.length - 10} more.` : `Total: ${data.length} users.`;

        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy All';
        copyButton.className = 'popup-copy-button';
        copyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            let headers, tsv;
            if (popupId === 'churned-popup') {
                headers = "First Name\tLast Name\tPhone Number\tStore Name\tStore Address\tLast Sale Date\tTransaction Count\n";
                tsv = data.map(row => {
                    const formattedDate = formatDate(row['Created Date']);
                    return `${row['First Name']}\t${row['Last Name']}\t${row['Phone Number']}\t${row['Store Name'] || ''}\t${row['Store Address'] || ''}\t${formattedDate === 'N/A' ? '' : formattedDate}\t${row['Transaction Count']}`
                }).join('\n');
            } else {
                headers = "First Name\tLast Name\tTransaction Count\tPhone Number\tReferral Code\n";
                tsv = data.map(row => `${row['First Name']}\t${row['Last Name']}\t${row['Transaction Count']}\t${row['Phone Number']}\t${row['Referral Code'] || ''}`).join('\n');
            }
            navigator.clipboard.writeText(headers + tsv).then(() => {
                copyButton.textContent = 'Copied!';
                copyButton.classList.add('copied');
                setTimeout(() => { copyButton.textContent = 'Copy All'; copyButton.classList.remove('copied'); }, 2000);
            });
        });

        footer.appendChild(remainingText);

        const buttonsWrapper = document.createElement('div');
        buttonsWrapper.className = 'flex items-center gap-2';

        if (popupId === 'churned-popup') {
            const viewAllBtn = document.createElement('button');
            viewAllBtn.textContent = 'Manage';
            viewAllBtn.className = 'popup-action-btn';
            viewAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                expandChurnPopup(container, title, data);
            });
            buttonsWrapper.appendChild(viewAllBtn);
        } else if (popupId === 'retained-popup' || popupId === 'total-popup') {
             const viewAeBtn = document.createElement('button');
             viewAeBtn.textContent = 'AE Analysis';
             viewAeBtn.className = 'popup-action-btn';
             viewAeBtn.addEventListener('click', (e) => {
                 e.stopPropagation();
                 const viewTitle = popupId === 'retained-popup' ? 'AE Retention View' : 'AE Performance View (Total)';
                 expandRetentionPopup(container, viewTitle, data);
             });
             buttonsWrapper.appendChild(viewAeBtn);
        }

        buttonsWrapper.appendChild(copyButton);
        footer.appendChild(buttonsWrapper);

        container.innerHTML = tableHTML;
        container.appendChild(footer);
    };

    const expandRetentionPopup = (container, title, data) => {
        container.classList.add('expanded');
        
        const p1Map = new Map();
        if (dataPeriod1 && dataPeriod1.length > 0) {
            dataPeriod1.forEach(u => p1Map.set(u['Phone Number'], u));
        }

        const aeStats = {};
        
        data.forEach(user => {
            const ae = user['Referral Code'] && user['Referral Code'].trim() !== "" 
                       ? user['Referral Code'] 
                       : "Unassigned/Direct";
            
            if (!aeStats[ae]) {
                aeStats[ae] = { 
                    name: ae, 
                    users: 0, 
                    txns: 0, 
                    amount: 0,
                    p1Amount: 0 
                };
            }
            
            aeStats[ae].users++;
            aeStats[ae].txns += (user['Transaction Count'] || 0);
            const currentAmount = (user['Total Amount'] || 0);
            aeStats[ae].amount += currentAmount;
            
            const p1User = p1Map.get(user['Phone Number']);
            if (p1User) {
                aeStats[ae].p1Amount += (p1User['Total Amount'] || 0);
            }
        });

        const sortedStats = Object.values(aeStats).sort((a, b) => b.amount - a.amount);
        const totalSystemAmount = sortedStats.reduce((sum, item) => sum + item.amount, 0);

        const periodText = formatPeriodText(dateRange2);
        
        const managementHeader = document.createElement('div');
        managementHeader.className = 'management-header';
        managementHeader.innerHTML = `
            <div class="flex flex-col">
                <h3 class="management-title">${title}</h3>
                <p class="text-xs text-slate-500">Breakdown of merchants by Account Executive (${periodText}).</p>
            </div>
        `;

        const tableContainer = document.createElement('div');
        tableContainer.className = 'popup-table-container';
        
        tableContainer.innerHTML = `
            <table class="popup-table">
                <thead>
                    <tr>
                        <th>AE Name / Referral</th>
                        <th class="text-center">Users Count</th>
                        <th class="text-right">Total Sales (P2)</th>
                        <th class="text-right">vs Prior Period</th>
                        <th class="text-center">Txn Count</th>
                        <th class="text-right">% of Total Vol.</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedStats.map(stat => {
                        const percentOfTotal = totalSystemAmount > 0 ? (stat.amount / totalSystemAmount * 100).toFixed(1) : 0;
                        const growth = stat.p1Amount > 0 ? ((stat.amount - stat.p1Amount) / stat.p1Amount * 100) : 0;
                        const growthClass = growth >= 0 ? 'text-green-600' : 'text-red-600';
                        const growthIcon = growth >= 0 ? '▲' : '▼';
                        const growthStr = stat.p1Amount > 0 ? `${growthIcon} ${Math.abs(growth).toFixed(1)}%` : '-';
                        
                        return `
                        <tr class="hover:bg-slate-100 transition-colors cursor-default">
                            <td class="font-medium text-slate-700">${stat.name}</td>
                            <td class="text-center font-semibold">${stat.users}</td>
                            <td class="text-right font-mono text-slate-600">${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(stat.amount)}</td>
                            <td class="text-right text-xs font-semibold ${growthClass}">${growthStr}</td>
                            <td class="text-center text-slate-500">${stat.txns}</td>
                            <td class="text-right text-xs text-slate-400">${percentOfTotal}%</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        `;

        const footer = document.createElement('div');
        footer.className = 'popup-footer';
        
        const totalText = document.createElement('span');
        totalText.textContent = `Tracking ${sortedStats.length} AEs/Referrers.`;

        const buttonsWrapper = document.createElement('div');
        buttonsWrapper.className = 'flex items-center gap-2';

        const collapseBtn = document.createElement('button');
        collapseBtn.textContent = 'Collapse';
        collapseBtn.className = 'popup-action-btn';
        collapseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (container.classList.contains('fullscreen')) {
                container.classList.remove('fullscreen');
                document.body.classList.remove('fullscreen-active');
            }
            createPopupTable(container.id, container.id === 'retained-popup' ? 'Retained Users' : 'Total Active Users', data);
        });

        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy Analysis';
        copyButton.className = 'popup-copy-button';
        copyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const headers = "AE Name\tUsers Count\tTotal Sales (P2)\tPrevious Sales (P1)\tTransaction Count\n";
            const tsv = sortedStats.map(stat => {
                return `${stat.name}\t${stat.users}\t${stat.amount}\t${stat.p1Amount}\t${stat.txns}`;
            }).join('\n');

            navigator.clipboard.writeText(headers + tsv).then(() => {
                copyButton.textContent = 'Copied!';
                copyButton.classList.add('copied');
                setTimeout(() => { copyButton.textContent = 'Copy Analysis'; copyButton.classList.remove('copied'); }, 2000);
            });
        });

        footer.appendChild(totalText);
        buttonsWrapper.appendChild(collapseBtn);
        buttonsWrapper.appendChild(copyButton);
        footer.appendChild(buttonsWrapper);

        container.innerHTML = '';
        container.appendChild(managementHeader);
        container.appendChild(tableContainer);
        container.appendChild(footer);
    };

    const expandChurnPopup = (container, title, data) => {
        container.classList.add('expanded');

        const managementHeader = document.createElement('div');
        managementHeader.className = 'management-header';
        managementHeader.innerHTML = `
            <h3 class="management-title">${title} - Management View</h3>
            <input type="text" id="management-search" class="management-search-input hidden" placeholder="Search assigned users...">
            <button class="fullscreen-toggle-btn" title="Toggle Fullscreen">
                <svg id="maximize-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
                <svg id="minimize-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 hidden">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
            </button>
        `;

        const tableContainer = document.createElement('div');
        tableContainer.className = 'popup-table-container';
        tableContainer.innerHTML = `
            <table class="popup-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Store Name</th>
                        <th>LGA</th>
                        <th>Store Address</th>
                        <th style="min-width: 100px;">Last Sale Date</th>
                        <th>Account Executive</th>
                    </tr>
                </thead>
                <tbody id="management-table-body">
                    ${data.map(row => {
                        const referralCode = row['Referral Code'];
                        let referralOption = '';
                        if (referralCode && !accountExecutives.includes(referralCode)) {
                            referralOption = `<option value="${referralCode}" selected>${referralCode} (Referral)</option>`;
                        }

                        const standardOptions = accountExecutives.map(name => {
                            const isSelected = (referralCode && name === referralCode) ? 'selected' : '';
                            return `<option value="${name}" ${isSelected}>${name}</option>`;
                        }).join('');

                        return `
                        <tr data-phone-row="${row['Phone Number']}">
                            <td data-label="Name">${row['First Name']} ${row['Last Name']}</td>
                            <td data-label="Phone">${row['Phone Number']}</td>
                            <td data-label="Store Name">${row['Store Name'] || 'N/A'}</td>
                            <td data-label="LGA">${row['LGA'] || 'N/A'}</td>
                            <td data-label="Store Address">${row['Store Address'] || 'N/A'}</td>
                            <td>${formatDate(row['Created Date'])}</td>
                            <td>
                                <select class="account-exec-select" data-phone="${row['Phone Number']}">
                                    <option value="">Assign...</option>
                                    ${referralOption}
                                    ${standardOptions}
                                </select>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        `;

        const footer = document.createElement('div');
        footer.className = 'popup-footer';
        
        const totalText = document.createElement('span');
        totalText.textContent = `Total: ${data.length} users.`;

        const monitorTools = document.createElement('div');
        monitorTools.className = 'monitor-tools hidden';
        monitorTools.innerHTML = `
            <label for="monitor-due-date" class="text-xs font-medium">Due Date:</label>
            <input type="date" id="monitor-due-date" class="monitor-due-date-input">
            <button id="create-monitor-btn" class="create-monitor-btn">Create live monitor</button>
        `;

        const buttonsWrapper = document.createElement('div');
        buttonsWrapper.className = 'flex items-center gap-2';

        const collapseBtn = document.createElement('button');
        collapseBtn.textContent = 'Collapse';
        collapseBtn.className = 'popup-action-btn';
        collapseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (container.classList.contains('fullscreen')) {
                container.classList.remove('fullscreen');
                document.body.classList.remove('fullscreen-active');
            }
            createPopupTable('churned-popup', title, data);
        });

        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy All';
        copyButton.className = 'popup-copy-button';
        copyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const assignments = {};
            container.querySelectorAll('.account-exec-select').forEach(select => {
                assignments[select.dataset.phone] = select.value;
            });

            const headers = "First Name\tLast Name\tPhone Number\tReferral Code\tStore Name\tLGA\tStore Address\tLast Sale Date\tAccount Executive\n";
            const tsv = data.map(row => {
                const executive = assignments[row['Phone Number']] || '';
                const formattedDate = formatDate(row['Created Date']);
                return `${row['First Name']}\t${row['Last Name']}\t${row['Phone Number']}\t${row['Referral Code'] || ''}\t${row['Store Name'] || ''}\t${row['LGA'] || ''}\t${row['Store Address'] || ''}\t${formattedDate === 'N.A' ? '' : formattedDate}\t${executive}`;
            }).join('\n');

            navigator.clipboard.writeText(headers + tsv).then(() => {
                copyButton.textContent = 'Copied!';
                copyButton.classList.add('copied');
                setTimeout(() => { copyButton.textContent = 'Copy All'; copyButton.classList.remove('copied'); }, 2000);
            });
        });

        footer.appendChild(totalText);
        buttonsWrapper.appendChild(collapseBtn);
        buttonsWrapper.appendChild(copyButton);
        buttonsWrapper.appendChild(monitorTools);
        footer.appendChild(buttonsWrapper);

        container.innerHTML = '';
        container.appendChild(managementHeader);
        container.appendChild(tableContainer);
        container.appendChild(footer);

        const fullscreenBtn = container.querySelector('.fullscreen-toggle-btn');
        const searchInput = container.querySelector('#management-search');
        
        const freezeBodyScroll = () => document.body.classList.add('fullscreen-active');
        const unfreezeBodyScroll = () => document.body.classList.remove('fullscreen-active');
        
        fullscreenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isNowFullscreen = container.classList.toggle('fullscreen');
            
            container.querySelector('#maximize-icon').classList.toggle('hidden');
            container.querySelector('#minimize-icon').classList.toggle('hidden');
            searchInput.classList.toggle('hidden');

            if (isNowFullscreen) {
                freezeBodyScroll();
                container.addEventListener('mouseenter', freezeBodyScroll);
                container.addEventListener('mouseleave', unfreezeBodyScroll);
            } else {
                unfreezeBodyScroll();
                container.removeEventListener('mouseenter', freezeBodyScroll);
                container.removeEventListener('mouseleave', unfreezeBodyScroll);
            }
        });

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const tableRows = container.querySelectorAll('#management-table-body tr');
            tableRows.forEach(row => {
                const name = row.querySelector('[data-label="Name"]').textContent.toLowerCase();
                const phone = row.querySelector('[data-label="Phone"]').textContent.toLowerCase();
                const store = row.querySelector('[data-label="Store Name"]').textContent.toLowerCase();
                const lga = row.querySelector('[data-label="LGA"]').textContent.toLowerCase();

                if (name.includes(searchTerm) || phone.includes(searchTerm) || store.includes(searchTerm) || lga.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });

        const selects = container.querySelectorAll('.account-exec-select');
        const updateMonitorToolsVisibility = () => {
            const hasAssignment = Array.from(selects).some(select => select.value !== '');
            if (hasAssignment) {
                container.querySelector('.monitor-tools').classList.remove('hidden');
            } else {
                container.querySelector('.monitor-tools').classList.add('hidden');
            }
        };
        selects.forEach(select => select.addEventListener('change', updateMonitorToolsVisibility));

        container.querySelector('#create-monitor-btn').addEventListener('click', () => {
            const dueDate = container.querySelector('#monitor-due-date').value;
            if (!dueDate) {
                alert('Please set a due date for the assignments.');
                return;
            }
            const assignedUsers = [];
            selects.forEach(select => {
                if (select.value) {
                    const userData = data.find(user => user['Phone Number'] === select.dataset.phone);
                    assignedUsers.push({ ...userData, assignedAE: select.value });
                }
            });
            generateMonitorPage(assignedUsers, dueDate);
        });
    };

    const generateMonitorPage = (assignedUsers, dueDate) => {
        if (!dateRange2 || !dateRange2.end || dateRange2.end === 'Data') {
            alert('Monitor creation is only available when using API fetch with valid date ranges.');
            return;
        }
        try {
            const uniqueAEs = [...new Set(assignedUsers.map(u => u.assignedAE).filter(Boolean))];
            
            const assignments = assignedUsers.map(u => {
                const aeIndex = uniqueAEs.indexOf(u.assignedAE);
                return [u['Phone Number'], aeIndex];
            });

            const monitorData = {
                v: 2,
                api: apiUrlInput.value.trim(),
                d1: { s: dateRange1.start, e: dateRange1.end },
                d2: { s: dateRange2.start, e: dateRange2.end },
                due: dueDate,
                cr: new Date().toISOString(),
                aes: uniqueAEs,
                a: assignments
            };

            const jsonString = JSON.stringify(monitorData);
            const compressed = window.pako ? window.pako.deflate(jsonString) : null;
            let base64String = '';
            
            if (compressed) {
                let binary = '';
                for (let i = 0; i < compressed.length; i++) {
                    binary += String.fromCharCode(compressed[i]);
                }
                base64String = btoa(binary);
            }

            const url = new URL('monitor.html', window.location.href);
            if (base64String) url.hash = base64String;
            
            window.open(url.href, '_blank');

        } catch (error) {
            console.error('Error creating monitor link:', error);
            alert('Could not create the monitor link. The user list may be too long.');
        }
    };

    const renderTable = (data) => {
        dataTable.innerHTML = '';
        noResultsEl.classList.toggle('hidden', data.length > 0);
        
        const isSkuVisible = skuToggle && skuToggle.checked;
        const skuClass = isSkuVisible ? 'sku-column' : 'sku-column hidden';

        const isStateVisible = stateToggle && stateToggle.checked;
        const stateClass = isStateVisible ? 'state-column' : 'state-column hidden';

        const isStoreTypeVisible = storeTypeToggle && storeTypeToggle.checked;
        const storeTypeClass = isStoreTypeVisible ? 'store-type-column' : 'store-type-column hidden';

        const isLastNameVisible = lastNameToggle && lastNameToggle.checked;
        const lastNameClass = isLastNameVisible ? 'last-name-column' : 'last-name-column hidden';

        const fragment = document.createDocumentFragment();
        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">${index + 1}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">${row['First Name']}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200 ${lastNameClass}">${row['Last Name']}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">${row['Phone Number']}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 hidden md:table-cell">${row['Referral Code'] || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">${row['LGA'] || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 ${stateClass}">${row['State'] || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400" title="${row['Store Name'] || ''}">${truncateText(row['Store Name'])}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 ${storeTypeClass}">${row['Store Type'] || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400" title="${row['Store Address'] || ''}">${truncateText(row['Store Address'])}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200 font-medium">${row['Transaction Count']}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200 font-medium ${skuClass}">${row['SKU Count']}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200 font-medium">${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(row['Total Amount'])}</td>
            `;
            fragment.appendChild(tr);
        });

        const totalTxn = data.reduce((sum, row) => sum + (row['Transaction Count'] || 0), 0);
        const totalSku = data.reduce((sum, row) => sum + (row['SKU Count'] || 0), 0);
        const totalAmt = data.reduce((sum, row) => sum + (row['Total Amount'] || 0), 0);

        if (data.length > 0) {
            const totalRow = document.createElement('tr');
            totalRow.className = 'bg-slate-50 dark:bg-slate-700 font-bold border-t-2 border-slate-300 dark:border-slate-500';
            totalRow.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500"></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500"></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 ${lastNameClass}"></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500"></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 hidden md:table-cell"></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500"></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 ${stateClass}"></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500"></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 ${storeTypeClass}"></td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-slate-800 dark:text-white">Grand Total:</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-white font-bold">${new Intl.NumberFormat('en-US').format(totalTxn)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-white font-bold ${skuClass}">${new Intl.NumberFormat('en-US').format(totalSku)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-white font-bold">${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(totalAmt)}</td>
            `;
            fragment.appendChild(totalRow);
        }

        dataTable.appendChild(fragment);
    };

    const destroyCharts = () => { Object.values(charts).forEach(chart => { if (chart) chart.destroy(); }); charts = {}; };

    const fetchAndRender90DayCharts = async (endDateStr) => {
        const baseUrl = apiUrlInput.value.trim();
        if (!baseUrl || !endDateStr) return;

        showStatus('Fetching 90-day trend data...');

        const retentionEndpoint = baseUrl.replace('/churn', '/retention');
        const endDate = new Date(endDateStr + 'T00:00:00');

        const periods = [];
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        let currentEnd = new Date(endDate);

        if (endDate.getDate() < 28) { 
            currentEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
        }
        
        for (let i = 0; i < 4; i++) {
            const pEnd = new Date(currentEnd);
            const pStart = new Date(pEnd.getFullYear(), pEnd.getMonth(), 1);
            periods.unshift({
                name: `${monthNames[pStart.getMonth()]} ${pStart.getFullYear()}`,
                start: toYYYYMMDD(pStart),
                end: toYYYYMMDD(pEnd)
            });
            currentEnd = new Date(pStart.getFullYear(), pStart.getMonth(), 0); 
        }

        const urls = periods.map(p => `${retentionEndpoint}?download=retained-user-stats&startDate=${p.start}&endDate=${p.end}`);
        
        try {
            const responses = await Promise.all(urls.map(url => fetch(url)));
            for (const response of responses) {
                if (!response.ok) throw new Error(`API error: ${response.statusText}`);
            }
            const csvTexts = await Promise.all(responses.map(res => res.text()));
            const allPeriodsData = await Promise.all(csvTexts.map(csv => parseAndProcessData(csv)));

            const chartMetrics = [];
            for (let i = 1; i < allPeriodsData.length; i++) {
                const priorPeriodData = allPeriodsData[i - 1];
                const currentPeriodData = allPeriodsData[i];

                const priorUsers = new Set(priorPeriodData.map(u => u['Phone Number']));
                const currentUsers = new Set(currentPeriodData.map(u => u['Phone Number']));

                const retained = new Set([...priorUsers].filter(phone => currentUsers.has(phone)));
                const newUsers = new Set([...currentUsers].filter(phone => !priorUsers.has(phone)));
                const churned = new Set([...priorUsers].filter(phone => !currentUsers.has(phone)));

                const totalTransactions = currentPeriodData.reduce((sum, u) => sum + (u['Transaction Count'] || 0), 0);
                const totalAmount = currentPeriodData.reduce((sum, u) => sum + (u['Total Amount'] || 0), 0);

                chartMetrics.push({
                    name: periods[i].name,
                    retained: retained.size,
                    new: newUsers.size,
                    churned: churned.size,
                    totalUsers: currentUsers.size,
                    totalTransactions,
                    totalAmount
                });
            }
            
            renderUserOverviewChart(chartMetrics);
            renderTransactionComparisonChart(chartMetrics);

        } catch (error) {
            console.error("Error fetching 90-day trend data:", error);
            showError(`Failed to fetch 90-day trend data: ${error.message}`);
        }
    };

    const renderUserOverviewChart = (data) => {
        if (charts.userChart) charts.userChart.destroy();
        const userCtx = document.getElementById('user-chart').getContext('2d');
    
        const labels = data.map(d => d.name);
        const retainedData = data.map(d => d.retained);
        const newData = data.map(d => d.new);
        const churnedData = data.map(d => d.churned);
    
        const retentionRateData = data.map(d => {
            const priorTotal = d.retained + d.churned;
            return priorTotal > 0 ? parseFloat(((d.retained / priorTotal) * 100).toFixed(1)) : 0;
        });
    
        const createGradient = (color, opacity = 0.4) => {
            const gradient = userCtx.createLinearGradient(0, 0, 0, 350);
            gradient.addColorStop(0, `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, `${color}00`);
            return gradient;
        };

        const allUserCounts = [...retainedData, ...newData, ...churnedData];
        const maxUserCount = Math.max(...allUserCounts);
        const suggestedMaxUsers = maxUserCount > 0 ? Math.ceil((maxUserCount * 1.2) / 10) * 10 : 10;
        
        const lineChartData = [
            {
                label: 'Retained Users',
                data: retainedData,
                borderColor: '#34d399',
                pointBackgroundColor: '#34d399',
                backgroundColor: createGradient('#34d399'),
                yAxisID: 'y',
            },
            {
                label: 'New Users',
                data: newData,
                borderColor: '#60a5fa',
                pointBackgroundColor: '#60a5fa',
                backgroundColor: createGradient('#60a5fa'),
                yAxisID: 'y',
            },
            {
                label: 'Churned Users (from prior)',
                data: churnedData,
                borderColor: '#ef4444',
                pointBackgroundColor: '#ef4444',
                backgroundColor: createGradient('#ef4444'),
                yAxisID: 'y',
            },
            {
                label: 'Retention Rate',
                data: retentionRateData,
                borderColor: '#a855f7',
                pointBackgroundColor: '#a855f7',
                backgroundColor: 'transparent',
                yAxisID: 'y1',
                borderDash: [5, 5],
                borderWidth: 2.5,
            }
        ];

        const annotations = {};
        for (let i = 0; i < labels.length - 1; i++) {
            annotations[`line${i}`] = {
                type: 'line',
                xMin: i + 0.5,
                xMax: i + 0.5,
                borderColor: 'rgba(203, 213, 225, 0.7)',
                borderWidth: 1,
                borderDash: [6, 6],
            };
        }
    
        charts.userChart = new Chart(userCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: lineChartData.map(ds => ({
                    ...ds,
                    tension: 0.4,
                    fill: true,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1.5,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, padding: 20 } },
                    title: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.85)',
                        titleFont: { weight: 'bold' },
                        bodySpacing: 8,
                        padding: 12,
                        usePointStyle: true,
                        boxPadding: 4,
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        callbacks: {
                            labelColor: (context) => ({
                                borderColor: context.dataset.borderColor,
                                backgroundColor: context.dataset.borderColor,
                                borderWidth: 2,
                                borderRadius: 2,
                            }),
                            label: (context) => {
                                let label = ` ${context.dataset.label || ''}`;
                                if (label) { label += ': '; }
                                let value = context.parsed.y;
                                if (context.dataset.yAxisID === 'y1') {
                                    label += value + '%';
                                } else {
                                    label += value;
                                }
                                return label;
                            },
                            footer: (tooltipItems) => {
                                const index = tooltipItems[0].dataIndex;
                                return `\nTotal Active Users: ${data[index].totalUsers.toLocaleString()}`;
                            }
                        }
                    },
                    annotation: {
                        annotations: annotations
                    }
                },
                scales: {
                    x: { 
                        grid: { 
                            display: false,
                        },
                        ticks: {
                            padding: 15,
                            font: {
                                weight: '500'
                            }
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        suggestedMax: suggestedMaxUsers,
                        title: { display: true, text: 'User Count', font: { weight: 'bold' } },
                        grid: { color: '#e2e8f0' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        max: 100,
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: 'Retention Rate (%)', font: { weight: 'bold' } },
                        ticks: {
                            callback: function(value) { return value + '%'; }
                        }
                    }
                }
            }
        });
    };

    const renderTransactionComparisonChart = (data) => {
        if (charts.transactionChart) charts.transactionChart.destroy();
        const transactionCtx = document.getElementById('transaction-chart').getContext('2d');

        const labels = data.map(d => d.name);
        const countData = data.map(d => d.totalTransactions);
        const valueData = data.map(d => d.totalAmount);

        const maxCount = Math.max(...countData);
        const suggestedMaxCount = maxCount > 0 ? Math.ceil((maxCount * 1.25) / 100) * 100 : 100;
        const maxValue = Math.max(...valueData);
        const suggestedMaxValue = maxValue > 0 ? Math.ceil((maxValue * 1.25) / 100000) * 100000 : 100000;

        charts.transactionChart = new Chart(transactionCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Transaction Volume (Count)', data: countData, backgroundColor: '#fbbf24', yAxisID: 'y' },
                    { label: 'Transaction Value (₦)', data: valueData, backgroundColor: '#60a5fa', yAxisID: 'y1' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: false },
                    tooltip: {
                        mode: 'index', intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.dataset.yAxisID === 'y1') {
                                    label += new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(context.parsed.y);
                                } else {
                                    label += context.parsed.y.toLocaleString('en-US');
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: { type: 'linear', display: true, position: 'left', beginAtZero: true, suggestedMax: suggestedMaxCount, title: { display: true, text: 'Transaction Count' } },
                    y1: {
                        type: 'linear', display: true, position: 'right', beginAtZero: true, suggestedMax: suggestedMaxValue,
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: 'Transaction Value (₦)' },
                        ticks: {
                            callback: function(value) {
                                if (value >= 1000000) return (value / 1000000) + 'M';
                                if (value >= 1000) return (value / 1000) + 'K';
                                return value;
                            }
                        }
                    }
                }
            }
        });
    };

    fetchApiBtn.addEventListener('click', handleApiFetch);

    reportInfoIcon.addEventListener('click', showReportModal);
    closeReportBtn.addEventListener('click', hideReportModal);
    reportModalOverlay.addEventListener('click', hideReportModal);
    copyReportBtn.addEventListener('click', copyReport);

    if (skuToggle) {
        skuToggle.addEventListener('change', () => {
            const cells = document.querySelectorAll('.sku-column');
            cells.forEach(cell => {
                if (skuToggle.checked) {
                    cell.classList.remove('hidden');
                } else {
                    cell.classList.add('hidden');
                }
            });
        });
    }

    if (stateToggle) {
        stateToggle.addEventListener('change', () => {
            const cells = document.querySelectorAll('.state-column');
            cells.forEach(cell => {
                if (stateToggle.checked) {
                    cell.classList.remove('hidden');
                } else {
                    cell.classList.add('hidden');
                }
            });
        });
    }

    if (storeTypeToggle) {
        storeTypeToggle.addEventListener('change', () => {
            const cells = document.querySelectorAll('.store-type-column');
            cells.forEach(cell => {
                if (storeTypeToggle.checked) {
                    cell.classList.remove('hidden');
                } else {
                    cell.classList.add('hidden');
                }
            });
        });
    }

    if (lastNameToggle) {
        lastNameToggle.addEventListener('change', () => {
            const cells = document.querySelectorAll('.last-name-column');
            cells.forEach(cell => {
                if (lastNameToggle.checked) {
                    cell.classList.remove('hidden');
                } else {
                    cell.classList.add('hidden');
                }
            });
        });
    }

    cohortToggle.addEventListener('change', () => {
        const isChecked = cohortToggle.checked;
        cohortInputs.classList.toggle('hidden', !isChecked);
        churnInputs.classList.toggle('hidden', isChecked);
        resetDashboard();
    });

    [apiStart1Input, apiEnd1Input, apiStart2Input, apiEnd2Input, apiStartChurnInput, apiEndChurnInput].forEach(input => {
        input.addEventListener('change', () => {
             period2Label = null;
        });
    });

    [apiStart1Input, apiEnd1Input].forEach(input => input.addEventListener('change', () => updateDateDisplay(apiStart1Input, apiEnd1Input, dateDisplay1)));
    [apiStart2Input, apiEnd2Input].forEach(input => input.addEventListener('change', () => updateDateDisplay(apiStart2Input, apiEnd2Input, dateDisplay2)));
    [apiStartChurnInput, apiEndChurnInput].forEach(input => input.addEventListener('change', () => updateDateDisplay(apiStartChurnInput, apiEndChurnInput, dateDisplayChurn)));

    const applyFilters = () => {
        const min = parseInt(minTransInput.value, 10);
        const max = parseInt(maxTransInput.value, 10);
        const searchTerm = searchInput.value.toLowerCase().trim();
        const searchCol = searchColumnSelect.value; 

        filteredData = dataPeriod2.filter(row => {
            const count = row['Transaction Count'];
            const minMatch = isNaN(min) || count >= min;
            const maxMatch = isNaN(max) || count <= max;
            if (!minMatch || !maxMatch) return false;

            if (searchTerm) {
                if (searchCol === 'all') {
                    const searchableValues = [
                        row['First Name'], 
                        row['Last Name'], 
                        row['Phone Number'], 
                        row['Referral Code'], 
                        row['LGA'],
                        row['State'], 
                        row['Store Name'], 
                        row['Store Type'], 
                        row['Store Address']
                    ].map(val => (val || '').toString().toLowerCase());
                    
                    return searchableValues.some(val => val.includes(searchTerm));
                } else {
                    const cellValue = (row[searchCol] || '').toString().toLowerCase();
                    return cellValue.includes(searchTerm);
                }
            }

            return true;
        });

        if (dataPeriod2.length > 0) {
            const count = filteredData.length;
            const total = dataPeriod2.length;
            
            if (searchTerm || !isNaN(min) || !isNaN(max)) {
                 tableDescription.innerHTML = `Found <span class="font-bold text-slate-900 dark:text-white">${count}</span> matching results (out of ${total}).`;
            } else {
                 tableDescription.textContent = `Showing all ${total} users in this period.`;
            }
        }
        
        renderTable(filteredData);
    };
    minTransInput.addEventListener('input', applyFilters);
    maxTransInput.addEventListener('input', applyFilters);
    searchInput.addEventListener('input', applyFilters);
    searchColumnSelect.addEventListener('change', applyFilters);

    exportBtn.addEventListener('click', () => {
        if (filteredData.length === 0) { alert('No data to export.'); return; }
        const exportColumns = [
            'First Name', 'Last Name', 'Phone Number', 'Referral Code', 
            'LGA', 'State', 'Store Name', 'Store Type', 'Store Address', 
            'Transaction Count', 'SKU Count', 'Total Amount'
        ];

        const csv = Papa.unparse(filteredData, {
            columns: exportColumns
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `filtered-users-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    const initDatePresets = () => {
        const presets = [
            { label: 'Last 7 Days', days: 7 }, { label: 'Last 30 Days', days: 30 },
            { label: 'This Month', type: 'month' }, { label: 'Last Month', type: 'last-month' },
        ];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const createButton = (preset, targetConfig) => {
            const btn = document.createElement('button');
            btn.className = 'date-preset-btn';
            btn.textContent = preset.label;
            btn.type = 'button';
            btn.addEventListener('click', (e) => {
                const siblings = targetConfig.container.querySelectorAll('.date-preset-btn');
                siblings.forEach(s => s.classList.remove('active'));
                
                btn.classList.add('active');
                
                let start, end;
                if (preset.type === 'month') {
                    start = new Date(today.getFullYear(), today.getMonth(), 1);
                    end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                } else if (preset.type === 'last-month') {
                    start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    end = new Date(today.getFullYear(), today.getMonth(), 0);
                } else {
                    end = new Date(today);
                    start = new Date(today);
                    start.setDate(start.getDate() - (preset.days - 1));
                }
                targetConfig.startInput.value = toYYYYMMDD(start);
                targetConfig.endInput.value = toYYYYMMDD(end);
                updateDateDisplay(targetConfig.startInput, targetConfig.endInput, targetConfig.displayContainer);

                if (targetConfig.isPeriod2) {
                    period2Label = preset.label;
                }
            });
            return btn;
        };

        const targets = [
            { container: apiPresets1, startInput: apiStart1Input, endInput: apiEnd1Input, displayContainer: dateDisplay1, isPeriod2: false },
            { container: apiPresets2, startInput: apiStart2Input, endInput: apiEnd2Input, displayContainer: dateDisplay2, isPeriod2: true },
            { container: apiPresetsChurn, startInput: apiStartChurnInput, endInput: apiEndChurnInput, displayContainer: dateDisplayChurn, isPeriod2: true },
        ];

        targets.forEach(target => {
            target.container.innerHTML = ''; 
            presets.forEach(p => target.container.appendChild(createButton(p, target)));
        });
    };

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    const triggerScrollHintAnimation = async () => {
        const arrow = document.getElementById('scroll-hint-arrow');
        const container = tableScrollContainer;
        const scrollableWidth = container.scrollWidth - container.clientWidth;

        if (scrollableWidth <= 0) return;

        const scrollDuration = 500; 
        const pauseDuration = 100;

        arrow.classList.add('is-visible');
        await sleep(50); 

        arrow.classList.remove('flip'); 
        container.scrollTo({ left: scrollableWidth, behavior: 'smooth' });
        await sleep(scrollDuration + pauseDuration);

        arrow.classList.add('flip');
        container.scrollTo({ left: 0, behavior: 'smooth' });
        await sleep(scrollDuration + pauseDuration);

        arrow.classList.remove('flip');
        container.scrollTo({ left: scrollableWidth, behavior: 'smooth' });
        await sleep(scrollDuration + pauseDuration);

        arrow.classList.add('flip');
        container.scrollTo({ left: 0, behavior: 'smooth' });
        await sleep(scrollDuration + pauseDuration);

        arrow.classList.remove('is-visible');
    };

    tableScrollContainer.addEventListener('mouseenter', () => {
        if (scrollHintCounter >= 2) return;

        const isScrollable = tableScrollContainer.scrollWidth > tableScrollContainer.clientWidth;
        if (isScrollable) {
            scrollHintCounter++;
            triggerScrollHintAnimation();
        }
    });

    const autorunFromUrl = () => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('autorun') !== 'true') return;

        const isCohort = urlParams.get('isCohort') === 'true';
        cohortToggle.checked = isCohort;
        cohortToggle.dispatchEvent(new Event('change'));

        if (isCohort) {
            apiStart1Input.value = urlParams.get('start1') || '';
            apiEnd1Input.value = urlParams.get('end1') || '';
            apiStart2Input.value = urlParams.get('start2') || '';
            apiEnd2Input.value = urlParams.get('end2') || '';
        } else {
            const churnStart = urlParams.get('startChurn') || '';
            const churnEnd = urlParams.get('endChurn') || '';
            
            if (isCohort === false && churnStart && churnEnd) {
                 apiStartChurnInput.value = churnStart;
                 apiEndChurnInput.value = churnEnd;
            } else { 
                apiStart1Input.value = urlParams.get('start1') || '';
                apiEnd1Input.value = urlParams.get('end1') || '';
                apiStart2Input.value = urlParams.get('start2') || '';
                apiEnd2Input.value = urlParams.get('end2') || '';
                cohortToggle.checked = true;
                cohortToggle.dispatchEvent(new Event('change'));
            }
        }
        
        [apiStart1Input, apiEnd1Input, apiStart2Input, apiEnd2Input, apiStartChurnInput, apiEndChurnInput].forEach(input => {
            if (input.value) input.dispatchEvent(new Event('change'));
        });
        
        period2Label = null;
        
        setTimeout(() => {
            fetchApiBtn.click();
        }, 100);
    };

    // --- NEW: Local safely formatted date for Weekly Monitor only ---
    const toLocalYYYYMMDD = (d) => {
        const pad = n => n < 10 ? '0' + n : n;
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    // --- NEW: Background Live Weekly Monitor Setup ---
    const setupWeeklyMonitor = async () => {
        const container = document.getElementById('weekly-monitor-content');
        if (!container) return;

        // Safely set the current day to 12 PM (noon) to dodge UTC offsets
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0); 
        const dayOfWeek = today.getDay();

        let anchorSunday = new Date(today);
        if (dayOfWeek !== 0) {
            anchorSunday.setDate(today.getDate() - dayOfWeek);
        }

        // Current Week Definition (Anchor Sunday to Next Sunday)
        const currentWeekStart = anchorSunday;
        const currentWeekEnd = new Date(anchorSunday);
        currentWeekEnd.setDate(anchorSunday.getDate() + 7);

        // Previous Week Definition (Previous Sunday to Anchor Sunday)
        const previousWeekStart = new Date(anchorSunday);
        previousWeekStart.setDate(anchorSunday.getDate() - 7);
        const previousWeekEnd = anchorSunday;

        const baseUrl = document.getElementById('api-url').value.trim() || 'https://pika-inventory-94729b833f18.herokuapp.com/api/v1/admin/analytics/retention';
        const retentionEndpoint = baseUrl.replace('/churn', '/retention');

        const parseCSV = (csvText) => {
            return new Promise((resolve) => {
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        const validRows = results.data.filter(row => {
                            const phone = row['Phone Number'];
                            const name = row['First Name'];
                            if (!phone || typeof phone !== 'string' || phone.trim() === '') return false;
                            if (name && /^(grand )?total$/i.test(name.trim())) return false;
                            return true;
                        });
                        resolve(validRows);
                    }
                });
            });
        };

        const getWeekData = async (weekStart, weekEnd) => {
            try {
                // Determine baseline observation dates for churn analysis
                const d2Start = new Date(weekStart);
                d2Start.setDate(weekStart.getDate() - 7);
                const d2End = new Date(weekStart);

                const d1End = new Date(d2Start);
                d1End.setDate(d2Start.getDate() - 1);
                const d1Start = new Date(d2Start);
                d1Start.setDate(d2Start.getDate() - 30);

                const urlP1 = `${retentionEndpoint}?download=retained-user-stats&startDate=${toLocalYYYYMMDD(d1Start)}&endDate=${toLocalYYYYMMDD(d1End)}`;
                const urlP2 = `${retentionEndpoint}?download=retained-user-stats&startDate=${toLocalYYYYMMDD(d2Start)}&endDate=${toLocalYYYYMMDD(d2End)}`;
                const urlChurnDetails = `${retentionEndpoint}?download=churned-users&startDate=${toLocalYYYYMMDD(d1Start)}&endDate=${toLocalYYYYMMDD(d1End)}`;

                const [res1, res2, resChurn] = await Promise.all([fetch(urlP1), fetch(urlP2), fetch(urlChurnDetails)]);
                if (!res1.ok || !res2.ok || !resChurn.ok) throw new Error("API Fetch failed for monitor generation.");

                const [csv1, csv2, csvChurn] = await Promise.all([res1.text(), res2.text(), resChurn.text()]);

                const p1Data = await parseCSV(csv1);
                const p2Data = await parseCSV(csv2);
                const churnDetails = await parseCSV(csvChurn);

                const p1Phones = new Set(p1Data.map(u => u['Phone Number']));
                const p2Phones = new Set(p2Data.map(u => u['Phone Number']));
                const churnedPhones = [...p1Phones].filter(p => !p2Phones.has(p));

                const churnMap = new Map(churnDetails.map(u => [u['Phone Number'], u]));

                const assignedUsers = churnedPhones.map(phone => {
                    const base = p1Data.find(u => u['Phone Number'] === phone);
                    const det = churnMap.get(phone) || {};
                    return {
                        ...base,
                        ...det,
                        assignedAE: det['Referral Code'] || base['Referral Code'] || 'Unassigned'
                    };
                });

                const uniqueAEs = [...new Set(assignedUsers.map(u => u.assignedAE))];
                const assignments = assignedUsers.map(u => {
                    const aeIndex = uniqueAEs.indexOf(u.assignedAE);
                    return [u['Phone Number'], aeIndex];
                });

                const monitorData = {
                    v: 2,
                    api: baseUrl,
                    d1: { s: toLocalYYYYMMDD(d1Start), e: toLocalYYYYMMDD(d1End) },
                    d2: { s: toLocalYYYYMMDD(d2Start), e: toLocalYYYYMMDD(d2End) },
                    due: toLocalYYYYMMDD(weekEnd),
                    cr: weekStart.toISOString(),
                    aes: uniqueAEs,
                    a: assignments
                };

                const jsonString = JSON.stringify(monitorData);
                const compressed = window.pako ? window.pako.deflate(jsonString) : null;
                let base64String = '';
                
                if (compressed) {
                    let binary = '';
                    for (let i = 0; i < compressed.length; i++) {
                        binary += String.fromCharCode(compressed[i]);
                    }
                    base64String = btoa(binary);
                }

                const monitorUrl = new URL('monitor.html', window.location.href);
                if (base64String) monitorUrl.hash = base64String;

                // Live stats fetch perfectly synced
                const monitorCreationDate = weekStart;

                const dateBufferStart = new Date(monitorCreationDate);
                dateBufferStart.setDate(dateBufferStart.getDate() - 1);

                const dateStrictStart = new Date(monitorCreationDate);

                const dateHistoricalStart = new Date(monitorCreationDate);
                dateHistoricalStart.setDate(dateHistoricalStart.getDate() - 360);
                const dateHistoricalEnd = new Date(monitorCreationDate);

                let limitDate = new Date();
                const dueEnd = new Date(weekEnd);
                dueEnd.setDate(dueEnd.getDate() - 1);
                dueEnd.setHours(23, 59, 59, 999);
                if (limitDate > dueEnd) {
                    limitDate = dueEnd;
                }

                const currentEndDate = new Date(limitDate);
                currentEndDate.setDate(currentEndDate.getDate() + 1);

                const urlOnboarding = `${retentionEndpoint}?download=retained-user-stats&startDate=${toLocalYYYYMMDD(dateBufferStart)}&endDate=${toLocalYYYYMMDD(currentEndDate)}`;
                const urlActivity = `${retentionEndpoint}?download=retained-user-stats&startDate=${toLocalYYYYMMDD(dateStrictStart)}&endDate=${toLocalYYYYMMDD(currentEndDate)}`;
                const urlHistorical = `${retentionEndpoint}?download=retained-user-stats&startDate=${toLocalYYYYMMDD(dateHistoricalStart)}&endDate=${toLocalYYYYMMDD(dateHistoricalEnd)}`;

                const [resOnb, resAct, resHist] = await Promise.all([fetch(urlOnboarding), fetch(urlActivity), fetch(urlHistorical)]);
                if (!resOnb.ok || !resAct.ok || !resHist.ok) throw new Error("API Fetch live stats failed.");

                const [csvOnb, csvAct, csvHist] = await Promise.all([resOnb.text(), resAct.text(), resHist.text()]);

                const onboardingData = await parseCSV(csvOnb);
                const activityData = await parseCSV(csvAct);
                const historicalData = await parseCSV(csvHist);

                const histPhones = new Set(historicalData.map(u => u['Phone Number']));
                const monitoredPhones = new Set(assignedUsers.map(u => u['Phone Number']));

                let onboardingCount = 0;
                onboardingData.forEach(u => {
                    const phone = u['Phone Number'];
                    if (!histPhones.has(phone) && !monitoredPhones.has(phone)) {
                        onboardingCount++;
                    }
                });

                let reactivatedCount = 0;
                let organicCount = 0;
                activityData.forEach(u => {
                    const phone = u['Phone Number'];
                    const isHist = histPhones.has(phone);
                    const isMon = monitoredPhones.has(phone);

                    if (isHist || isMon) {
                        if (isMon) reactivatedCount++;
                        else organicCount++;
                    }
                });

                return {
                    onboarding: onboardingCount,
                    reactivated: reactivatedCount,
                    organic: organicCount,
                    link: monitorUrl.href,
                    startStr: weekStart.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
                    endStr: weekEnd.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
                    error: false
                };

            } catch (err) {
                console.error("Error generating week data:", err);
                return {
                    onboarding: '--',
                    reactivated: '--',
                    organic: '--',
                    link: '#',
                    startStr: weekStart.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
                    endStr: weekEnd.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
                    error: true
                };
            }
        };

        try {
            // Concurrent execution for both monitors
            const [currentWk, prevWk] = await Promise.all([
                getWeekData(currentWeekStart, currentWeekEnd),
                getWeekData(previousWeekStart, previousWeekEnd)
            ]);

            const buildCard = (title, data, isPrimary) => {
                const bgClass = isPrimary ? "bg-white dark:bg-slate-800" : "bg-slate-50 dark:bg-slate-800/50 opacity-90";
                const borderClass = isPrimary ? "border-slate-200 dark:border-slate-700 shadow-sm" : "border-slate-200 dark:border-slate-700 shadow-none";
                const pointerClass = data.error ? "opacity-50 cursor-not-allowed pointer-events-none" : "";
                
                return `
                    <div class="${bgClass} border ${borderClass} rounded-xl p-5 mb-4 last:mb-0 transition-all">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                            <div>
                                <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">${title}</h4>
                                <h3 class="text-lg font-bold text-slate-800 dark:text-white mt-1">${data.startStr} to ${data.endStr}</h3>
                            </div>
                            <a href="${data.link}" target="_blank" class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 px-4 rounded-md shadow-sm transition-colors text-sm flex items-center gap-2 ${pointerClass}">
                                Open Monitor
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/50 p-3 rounded-lg flex items-center">
                                <div class="bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-200 p-2 rounded-full mr-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                </div>
                                <div>
                                    <p class="text-xs font-medium text-violet-600 dark:text-violet-400">Onboarding</p>
                                    <p class="text-xl font-bold text-slate-800 dark:text-white">${data.onboarding}</p>
                                </div>
                            </div>
                            <div class="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 p-3 rounded-lg flex items-center">
                                <div class="bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-200 p-2 rounded-full mr-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                </div>
                                <div>
                                    <p class="text-xs font-medium text-green-600 dark:text-green-400">Reactivation-based</p>
                                    <p class="text-xl font-bold text-slate-800 dark:text-white">${data.reactivated}</p>
                                </div>
                            </div>
                            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-3 rounded-lg flex items-center">
                                <div class="bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-200 p-2 rounded-full mr-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div>
                                    <p class="text-xs font-medium text-blue-600 dark:text-blue-400">Organic Active</p>
                                    <p class="text-xl font-bold text-slate-800 dark:text-white">${data.organic}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            };

            container.innerHTML = `
                <div class="p-6 transition-all bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
                    ${buildCard("Current Week", currentWk, true)}
                    ${buildCard("Previous Week", prevWk, false)}
                </div>
            `;

        } catch (err) {
            console.error("Weekly Monitor Background Process Error:", err);
            container.innerHTML = `<div class="p-6 text-center text-red-500 font-medium"><p>Failed to generate live weekly insights.</p></div>`;
        }
    };

    // Initial setup on page load
    cohortInputs.classList.add('hidden');
    churnInputs.classList.remove('hidden');
    initDatePresets();
    setupWeeklyMonitor();
    autorunFromUrl();
});