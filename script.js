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
    const uploadContainer1 = document.getElementById('upload-container-1');
    const uploadContainer2 = document.getElementById('upload-container-2');
    const fileInput1 = document.getElementById('csv-file-1');
    const fileInput2 = document.getElementById('csv-file-2');
    const fileName1 = document.getElementById('file-name-1');
    const fileName2 = document.getElementById('file-name-2');
    const dateRangeEl1 = document.getElementById('date-range-1');
    const dateRangeEl2 = document.getElementById('date-range-2');
    const uploadLabel2 = document.getElementById('upload-label-2');
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
    const exportBtn = document.getElementById('export-csv');
    const noResultsEl = document.getElementById('no-results');
    const tableDescription = document.getElementById('table-description');
    const reportInfoIcon = document.getElementById('report-info-icon');
    const reportModalOverlay = document.getElementById('report-modal-overlay');
    const reportModal = document.getElementById('report-modal');
    const reportContent = document.getElementById('report-content');
    const copyReportBtn = document.getElementById('copy-report-btn');
    const closeReportBtn = document.getElementById('close-report-btn');

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

        fileInput1.value = '';
        fileInput2.value = '';
        fileName1.textContent = 'Drag & drop or click to upload';
        fileName2.textContent = 'Upload Period 1 file first';
        dateRangeEl1.textContent = '';
        dateRangeEl2.textContent = '';
        if (!uploadContainer2.classList.contains('disabled')) {
             uploadContainer2.classList.add('disabled');
             uploadLabel2.classList.add('cursor-not-allowed');
             fileInput2.disabled = true;
        }

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
                    const parsedData = results.data.map(row => ({
                        ...row,
                        'Transaction Count': parseInt(row['Transaction Count'], 10) || 0,
                        'Total Amount': parseFloat(row['Total Amount']) || 0,
                    }));

                    if (period === 1) dataPeriod1 = parsedData;
                    else if (period === 2) dataPeriod2 = parsedData;
                    else if (period === 'churn') churnUserDetails = parsedData;
                    
                    resolve(parsedData); // Resolve with the data
                },
                error: (error) => reject(new Error(`CSV Parsing Error: ${error.message}`))
            });
        });
    };

    const handleFileUpload = async (file, period) => {
        if (!file) return;

        resetError();
        loadingOverlay.classList.remove('hidden');
        showStatus(`Processing ${file.name}...`);
        period2Label = null; 

        const dateRange = { start: 'File', end: 'Data' };

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                await parseAndProcessData(e.target.result, period);
                if (period === 1) {
                    dateRange1 = dateRange;
                    fileName1.textContent = file.name;
                    dateRangeEl1.textContent = '';
                    enablePeriod2Upload();
                    hideStatus();
                } else {
                    dateRange2 = dateRange;
                    fileName2.textContent = file.name;
                    dateRangeEl2.textContent = '';
                    churnUserDetails = dataPeriod1; 
                    await analyzeData();
                    hideStatus();
                    dashboard.classList.remove('hidden');
                    dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } catch (error) {
                showError(error.message);
            } finally {
                 if (period === 2) {
                    loadingOverlay.classList.add('hidden');
                 }
            }
        };
        reader.readAsText(file);
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

    const enablePeriod2Upload = () => {
        uploadContainer2.classList.remove('disabled');
        uploadLabel2.classList.remove('cursor-not-allowed');
        uploadLabel2.classList.add('cursor-pointer');
        fileInput2.disabled = false;
        fileName2.textContent = 'Drag & drop or click to upload';
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
                ...p1Data, // Data from period 1 (last active period)
                ...details, // Enriched data from churn endpoint (like Referral Code, Store Name, etc.)
                'Created Date': details ? details['Created Date'] : (p1Data ? p1Data['Created Date'] : null),
                'Store Name': details ? details['Store Name'] : (p1Data ? p1Data['Store Name'] : 'N/A'),
                'Store Address': details ? details['Store Address'] : (p1Data ? p1Data['Store Address'] : 'N/A'),
                'LGA': details ? details['LGA'] : (p1Data ? p1Data['LGA'] : 'N/A'),
                // Referral Code will be carried over from 'details' if it exists
            };
        });
        
        const retentionRate = usersP1PhoneNumbers.size > 0 ? (retainedUsersSet.size / usersP1PhoneNumbers.size * 100).toFixed(1) : 0;
        
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

        tableTitle.textContent = `User Data for ${period2Text}`;
        tableDescription.textContent = `Showing ${dataPeriod2.length} total users in this period.`;

        // 90-DAY CHART RENDERING
        if (dateRange2 && dateRange2.end && dateRange2.end !== 'Data') {
             await fetchAndRender90DayCharts(dateRange2.end);
        } else {
            destroyCharts();
            const userCtx = document.getElementById('user-chart').getContext('2d');
            userCtx.clearRect(0, 0, userCtx.canvas.width, userCtx.canvas.height);
            userCtx.font = "16px Inter";
            userCtx.fillStyle = "#64748b";
            userCtx.textAlign = "center";
            userCtx.fillText("90-day trend not available for file uploads.", userCtx.canvas.width / 2, 50);

            const transCtx = document.getElementById('transaction-chart').getContext('2d');
            transCtx.clearRect(0, 0, transCtx.canvas.width, transCtx.canvas.height);
            transCtx.font = "16px Inter";
            transCtx.fillStyle = "#64748b";
            transCtx.textAlign = "center";
            transCtx.fillText("90-day trend not available for file uploads.", transCtx.canvas.width / 2, 50);
        }
        
        reportData = {
            retentionRate: retentionRate,
            newUsers: newUsersSet.size,
            churnedUsers: churnedData.length,
            totalActiveUsers: usersP2PhoneNumbers.size,
            period1Text: period1Text,
            period2Text: period2Text,
            periodLabel: period2Label,
            isApiMode: !fileInput1.files[0] && !fileInput2.files[0],
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

Verification Link:
${analysisUrl}`;

        } else {
            summaryText = `Report Summary: File 1 vs. File 2
(Auto-generated with Pika-RS)

Date & Time Stamp of Generated Report: ${timestamp}

- Retention: ${reportData.retentionRate}% of users from your first file (Period 1) were also present in your second file (Period 2).

- New Users: ${reportData.newUsers} users were present in the second file but not in the first.

- Churn: ${reportData.churnedUsers} users from the first file were missing from the second file.

- Total Active Users: The second file contains a total of ${reportData.totalActiveUsers} users.`;
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
                headers = "First Name\tLast Name\tTransaction Count\tPhone Number\n";
                tsv = data.map(row => `${row['First Name']}\t${row['Last Name']}\t${row['Transaction Count']}\t${row['Phone Number']}`).join('\n');
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
        }

        buttonsWrapper.appendChild(copyButton);
        footer.appendChild(buttonsWrapper);

        container.innerHTML = tableHTML;
        container.appendChild(footer);
    };

    const expandChurnPopup = (container, title, data) => {
        container.classList.add('expanded');

        // This logic is now handled inline inside the data.map loop
        // const executiveOptions = `<option value="">Assign...</option>` + accountExecutives.map(name => `<option value="${name}">${name}</option>`).join('');

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
                        // Check if a referral code exists and if it's NOT already in the main AE list
                        if (referralCode && !accountExecutives.includes(referralCode)) {
                            referralOption = `<option value="${referralCode}" selected>${referralCode} (Referral)</option>`;
                        }

                        // Build the standard AE options
                        const standardOptions = accountExecutives.map(name => {
                            // If the referral code IS one of the AEs, select it
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
                return `${row['First Name']}\t${row['Last Name']}\t${row['Phone Number']}\t${row['Referral Code'] || ''}\t${row['Store Name'] || ''}\t${row['LGA'] || ''}\t${row['Store Address'] || ''}\t${formattedDate === 'N/A' ? '' : formattedDate}\t${executive}`;
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
            const monitorData = {
                assignedUsers,
                dueDate,
                creationDate: new Date().toISOString(),
                reactivationStartDate: dateRange2.end,
                dateRange1: dateRange1,
                dateRange2: dateRange2,
                apiBaseUrl: apiUrlInput.value.trim()
            };

            const jsonString = JSON.stringify(monitorData);
            const compressed = pako.deflate(jsonString);
            const base64String = btoa(String.fromCharCode.apply(null, compressed));

            const url = new URL('monitor.html', window.location.href);
            url.hash = base64String;
            
            window.open(url.href, '_blank');

        } catch (error) {
            console.error('Error creating monitor link:', error);
            alert('Could not create the monitor link. The user list may be too long.');
        }
    };

    const renderTable = (data) => {
        dataTable.innerHTML = '';
        noResultsEl.classList.toggle('hidden', data.length > 0);
        const fragment = document.createDocumentFragment();
        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-800">${row['First Name']}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-800">${row['Last Name']}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${row['Phone Number']}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 hidden md:table-cell">${row['Referral Code'] || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${row['LGA'] || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500" title="${row['Store Name'] || ''}">${truncateText(row['Store Name'])}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500" title="${row['Store Address'] || ''}">${truncateText(row['Store Address'])}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-medium">${row['Transaction Count']}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-medium">${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(row['Total Amount'])}</td>
            `;
            fragment.appendChild(tr);
        });
        dataTable.appendChild(fragment);
    };

    const destroyCharts = () => { Object.values(charts).forEach(chart => { if (chart) chart.destroy(); }); charts = {}; };

    // --- NEW 90-DAY CHARTING LOGIC ---

    const fetchAndRender90DayCharts = async (endDateStr) => {
        const baseUrl = apiUrlInput.value.trim();
        if (!baseUrl || !endDateStr) return;

        showStatus('Fetching 90-day trend data...');

        const retentionEndpoint = baseUrl.replace('/churn', '/retention');
        const endDate = new Date(endDateStr + 'T00:00:00');

        const periods = [];
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        let currentEnd = new Date(endDate);

        if (endDate.getDate() < 28) { // If period is not a full month, go back to previous full month's end
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
            // This logic correctly handles all month lengths (30, 31, 28, 29 days)
            currentEnd = new Date(pStart.getFullYear(), pStart.getMonth(), 0); // End of previous month
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
            // This loop correctly calculates metrics for the last 3 months by comparing each to its prior month.
            // This ensures the data for both charts is accurate and synchronized.
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
                borderColor: 'rgba(203, 213, 225, 0.7)', // slate-300 with opacity
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
                        backgroundColor: 'rgba(15, 23, 42, 0.85)', // slate-900
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
                        grid: { color: '#e2e8f0' } // slate-200
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


    // --- EVENT LISTENERS & INITIALIZATION ---
    fileInput1.addEventListener('change', () => handleFileUpload(fileInput1.files[0], 1));
    fileInput2.addEventListener('change', () => handleFileUpload(fileInput2.files[0], 2));
    fetchApiBtn.addEventListener('click', handleApiFetch);

    reportInfoIcon.addEventListener('click', showReportModal);
    closeReportBtn.addEventListener('click', hideReportModal);
    reportModalOverlay.addEventListener('click', hideReportModal);
    copyReportBtn.addEventListener('click', copyReport);

    cohortToggle.addEventListener('change', () => {
        const isChecked = cohortToggle.checked;
        cohortInputs.classList.toggle('hidden', !isChecked);
        churnInputs.classList.toggle('hidden', isChecked);
        resetDashboard();
    });

    [uploadContainer1, uploadContainer2].forEach((container, index) => {
        container.addEventListener('dragover', (e) => { e.preventDefault(); if (!container.classList.contains('disabled')) container.classList.add('dragover'); });
        container.addEventListener('dragleave', (e) => { e.preventDefault(); container.classList.remove('dragover'); });
        container.addEventListener('drop', (e) => { e.preventDefault(); container.classList.remove('dragover'); if (!container.classList.contains('disabled')) { const files = e.dataTransfer.files; if (files.length) { const fileInput = index === 0 ? fileInput1 : fileInput2; fileInput.files = files; handleFileUpload(files[0], index + 1); } } });
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

        filteredData = dataPeriod2.filter(row => {
            const count = row['Transaction Count'];
            const minMatch = isNaN(min) || count >= min;
            const maxMatch = isNaN(max) || count <= max;

            if (!minMatch || !maxMatch) return false;

            if (searchTerm) {
                const fullName = `${row['First Name'] || ''} ${row['Last Name'] || ''}`.toLowerCase();
                const phone = (row['Phone Number'] || '').toLowerCase();
                const lga = (row['LGA'] || '').toLowerCase();
                const store = (row['Store Name'] || '').toLowerCase();
                const referral = (row['Referral Code'] || '').toLowerCase();

                return fullName.includes(searchTerm) ||
                       phone.includes(searchTerm) ||
                       lga.includes(searchTerm) ||
                       store.includes(searchTerm) ||
                       referral.includes(searchTerm);
            }

            return true;
        });
        renderTable(filteredData);
    };
    minTransInput.addEventListener('input', applyFilters);
    maxTransInput.addEventListener('input', applyFilters);
    searchInput.addEventListener('input', applyFilters);

    exportBtn.addEventListener('click', () => {
        if (filteredData.length === 0) { alert('No data to export.'); return; }
        const csv = Papa.unparse(filteredData, {
            columns: ['First Name', 'Last Name', 'Phone Number', 'Referral Code', 'LGA', 'Store Name', 'Store Address', 'Transaction Count', 'Total Amount']
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
            btn.addEventListener('click', () => {
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

    // Initial setup on page load
    cohortInputs.classList.add('hidden');
    churnInputs.classList.remove('hidden');
    initDatePresets();
    autorunFromUrl();
});