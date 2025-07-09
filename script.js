document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT & CONSTANTS ---
    let dataPeriod1 = [];
    let dataPeriod2 = [];
    let churnDataPeriod = []; // <-- Holds data from the new churn-specific endpoint
    let filteredData = [];
    let dateRange1 = null;
    let dateRange2 = null;
    let period2Label = null; // <-- To store the label from a preset button
    let charts = {};
    let scrollHintCounter = 0;
    let reportData = {};
    const accountExecutives = ['Chimezie Ezimoha', 'Waheed Ayinla', 'Abraham Ohworieha', 'Semilogo (for phone call)'];

    // --- DOM ELEMENTS (File Upload) ---
    const uploadContainer1 = document.getElementById('upload-container-1');
    const uploadContainer2 = document.getElementById('upload-container-2');
    const fileInput1 = document.getElementById('csv-file-1');
    const fileInput2 = document.getElementById('csv-file-2');
    const fileName1 = document.getElementById('file-name-1');
    const fileName2 = document.getElementById('file-name-2');
    const dateRangeEl1 = document.getElementById('date-range-1');
    const dateRangeEl2 = document.getElementById('date-range-2');
    const uploadLabel2 = document.getElementById('upload-label-2');

    // --- DOM ELEMENTS (API Fetch) ---
    const apiUrlInput = document.getElementById('api-url');
    const fetchApiBtn = document.getElementById('fetch-api-data');

    // Cohort Elements
    const cohortToggle = document.getElementById('cohort-toggle');
    const cohortInputs = document.getElementById('cohort-inputs');
    const apiStart1Input = document.getElementById('api-start-1');
    const apiEnd1Input = document.getElementById('api-end-1');
    const apiStart2Input = document.getElementById('api-start-2');
    const apiEnd2Input = document.getElementById('api-end-2');
    const apiPresets1 = document.getElementById('api-presets-1');
    const apiPresets2 = document.getElementById('api-presets-2');

    // Churn Elements
    const churnInputs = document.getElementById('churn-inputs');
    const apiStartChurnInput = document.getElementById('api-start-churn');
    const apiEndChurnInput = document.getElementById('api-end-churn');
    const apiPresetsChurn = document.getElementById('api-presets-churn');

    // Visual Date Display Elements
    const dateDisplay1 = document.getElementById('date-display-1');
    const dateDisplay2 = document.getElementById('date-display-2');
    const dateDisplayChurn = document.getElementById('date-display-churn');


    // --- GENERAL DOM ELEMENTS ---
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

    // --- REPORT MODAL ELEMENTS ---
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
        churnDataPeriod = [];
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


        ['retained-popup', 'new-popup', 'churned-popup', 'total-popup'].forEach(id => {
            const popup = document.getElementById(id);
            if (popup) {
                popup.innerHTML = '';
                popup.classList.remove('expanded');
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
                    const requiredColumns = ['First Name', 'Last Name', 'Phone Number', 'Transaction Count', 'Total Amount'];
                    let missingColumns = [];

                    if (period !== 'churn') {
                        missingColumns = requiredColumns.filter(col => !results.meta.fields.includes(col));
                    }

                    if (missingColumns.length > 0) {
                        return reject(new Error(`Missing required columns in data: ${missingColumns.join(', ')}`));
                    }

                    const parsedData = results.data.map(row => ({
                        ...row,
                        'Transaction Count': parseInt(row['Transaction Count'], 10) || 0,
                        'Total Amount': parseFloat(row['Total Amount']) || 0,
                    }));

                    if (period === 1) dataPeriod1 = parsedData;
                    else if (period === 2) dataPeriod2 = parsedData;
                    else if (period === 'churn') churnDataPeriod = parsedData;

                    resolve();
                },
                error: (error) => reject(new Error(`CSV Parsing Error: ${error.message}`))
            });
        });
    };

    const handleFileUpload = (file, period) => {
        if (!file) return;

        resetError();
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
                    analyzeData();
                }
            } catch (error) {
                showError(error.message);
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
            start2 = churnStart; end2 = churnEnd;
            const period2StartDate = new Date(churnStart + 'T00:00:00');
            const period1EndDate = new Date(period2StartDate);
            period1EndDate.setDate(period1EndDate.getDate() - 1);
            const period1StartDate = new Date(period1EndDate);
            period1StartDate.setDate(period1StartDate.getDate() - 29);
            start1 = toYYYYMMDD(period1StartDate);
            end1 = toYYYYMMDD(period1EndDate);
        }

        loadingOverlay.classList.remove('hidden'); 
        showStatus('Fetching data from API...');
        dateRange1 = { start: start1, end: end1 };
        dateRange2 = { start: start2, end: end2 };

        const retentionEndpoint = baseUrl.replace('/churn', '/retention');
        const url1 = `${retentionEndpoint}?download=retained-user-stats&startDate=${start1}&endDate=${end1}`;
        const url2 = `${retentionEndpoint}?download=retained-user-stats&startDate=${start2}&endDate=${end2}`;
        const churnUrl = `${retentionEndpoint}?download=churned-users&startDate=${start1}&endDate=${end1}`;

        try {
            const [response1, response2, churnResponse] = await Promise.all([fetch(url1), fetch(url2), fetch(churnUrl)]);

            if (!response1.ok) throw new Error(`API error for Period 1: ${response1.status} ${response1.statusText}`);
            if (!response2.ok) throw new Error(`API error for Period 2: ${response2.status} ${response2.statusText}`);
            if (!churnResponse.ok) throw new Error(`API error for Churn Data: ${churnResponse.status} ${churnResponse.statusText}`);

            const [csvText1, csvText2, churnCsvText] = await Promise.all([response1.text(), response2.text(), churnResponse.text()]);

            await Promise.all([
                parseAndProcessData(csvText1, 1),
                parseAndProcessData(csvText2, 2),
                parseAndProcessData(churnCsvText, 'churn')
            ]);
            analyzeData();
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

    const analyzeData = () => {
        showStatus('Analyzing data...');
        hasShownScrollIndicator = false; 

        const usersP1PhoneNumbers = new Set(dataPeriod1.map(u => u['Phone Number']));
        const usersP2PhoneNumbers = new Set(dataPeriod2.map(u => u['Phone Number']));

        const retainedUsersSet = new Set([...usersP1PhoneNumbers].filter(phone => usersP2PhoneNumbers.has(phone)));
        const newUsersSet = new Set([...usersP2PhoneNumbers].filter(phone => !usersP1PhoneNumbers.has(phone)));

        let relevantChurnData;
        if (churnDataPeriod.length > 0) {
             relevantChurnData = churnDataPeriod.filter(churnedUser =>
                usersP1PhoneNumbers.has(churnedUser['Phone Number'])
            );
        } else {
            const churnedPhoneNumbers = new Set([...usersP1PhoneNumbers].filter(phone => !usersP2PhoneNumbers.has(phone)));
            relevantChurnData = dataPeriod1.filter(user => churnedPhoneNumbers.has(user['Phone Number']));
        }

        const churnedUsersCount = relevantChurnData.length;
        const retentionRate = usersP1PhoneNumbers.size > 0 ? (retainedUsersSet.size / usersP1PhoneNumbers.size * 100).toFixed(1) : 0;

        document.getElementById('retention-rate').textContent = `${retentionRate}%`;
        document.getElementById('retained-users').textContent = retainedUsersSet.size;
        document.getElementById('new-users').textContent = newUsersSet.size;
        document.getElementById('churned-users').textContent = churnedUsersCount;
        document.getElementById('total-users').textContent = usersP2PhoneNumbers.size;

        const period1Text = formatPeriodText(dateRange1);
        const period2Text = formatPeriodText(dateRange2);

        document.getElementById('retained-when').textContent = `from ${period2Text}`;
        document.getElementById('new-when').textContent = `from ${period2Text}`;
        document.getElementById('churned-when').textContent = `from ${period1Text}`;
        document.getElementById('total-when').textContent = `from ${period2Text}`;

        const retainedData = dataPeriod2.filter(u => retainedUsersSet.has(u['Phone Number']));
        const newData = dataPeriod2.filter(u => newUsersSet.has(u['Phone Number']));

        createPopupTable('retained-popup', 'Retained Users', retainedData);
        createPopupTable('new-popup', 'New Users', newData);
        createPopupTable('churned-popup', 'Churned Users', relevantChurnData);
        createPopupTable('total-popup', 'Total Active Users', dataPeriod2);

        tableTitle.textContent = `User Data for ${period2Text}`;
        tableDescription.textContent = `Showing ${dataPeriod2.length} total users in this period.`;

        renderCharts({ p1: { count: usersP1PhoneNumbers.size }, p2: { count: usersP2PhoneNumbers.size }, retained: retainedUsersSet.size });

        const totalTransactionsP1 = dataPeriod1.reduce((sum, u) => sum + (u['Transaction Count'] || 0), 0);
        const totalTransactionsP2 = dataPeriod2.reduce((sum, u) => sum + (u['Transaction Count'] || 0), 0);
        const totalAmountP1 = dataPeriod1.reduce((sum, u) => sum + (u['Total Amount'] || 0), 0);
        const totalAmountP2 = dataPeriod2.reduce((sum, u) => sum + (u['Total Amount'] || 0), 0);

        renderTransactionChart({ p1: { count: totalTransactionsP1, amount: totalAmountP1 }, p2: { count: totalTransactionsP2, amount: totalAmountP2 } });

        reportData = {
            retentionRate: retentionRate,
            newUsers: newUsersSet.size,
            churnedUsers: churnedUsersCount,
            totalActiveUsers: usersP2PhoneNumbers.size,
            period1Text: period1Text,
            period2Text: period2Text,
            periodLabel: period2Label,
            isApiMode: !fileInput1.files[0],
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

        hideStatus();
        dashboard.classList.remove('hidden');

        dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            // Fallback for File Uploads
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
                    <tbody>${data.slice(0, 10).map(row => `<tr><td>${row['First Name']} ${row['Last Name']}</td><td style="text-align: center;">${row['Transaction Count'] || 'N/A'}</td><td>${row['Phone Number']}</td></tr>`).join('')}</tbody>
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
                headers = "First Name\tLast Name\tPhone Number\tStore Name\tStore Address\tLast Sale Date\n";
                tsv = data.map(row => {
                    const formattedDate = formatDate(row['Created Date']);
                    return `${row['First Name']}\t${row['Last Name']}\t${row['Phone Number']}\t${row['Store Name'] || ''}\t${row['Store Address'] || ''}\t${formattedDate === 'N/A' ? '' : formattedDate}`
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

        const executiveOptions = `<option value="">Assign...</option>` + accountExecutives.map(name => `<option value="${name}">${name}</option>`).join('');

        const tableHTML = `
            <div class="p-4 border-b border-slate-200"><h3 class="font-semibold text-slate-700">${title} - Management View</h3></div>
            <div class="popup-table-container">
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
                    <tbody>
                        ${data.map(row => `
                        <tr data-phone-row="${row['Phone Number']}">
                            <td>${row['First Name']} ${row['Last Name']}</td>
                            <td>${row['Phone Number']}</td>
                            <td>${row['Store Name'] || 'N/A'}</td>
                            <td>${row['LGA'] || 'N/A'}</td>
                            <td>${row['Store Address'] || 'N/A'}</td>
                            <td>${formatDate(row['Created Date'])}</td>
                            <td>
                                <select class="account-exec-select" data-phone="${row['Phone Number']}">
                                    ${executiveOptions}
                                </select>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>`;

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

            const headers = "First Name\tLast Name\tPhone Number\tStore Name\tLGA\tStore Address\tLast Sale Date\tAccount Executive\n";
            const tsv = data.map(row => {
                const executive = assignments[row['Phone Number']] || '';
                const formattedDate = formatDate(row['Created Date']);
                return `${row['First Name']}\t${row['Last Name']}\t${row['Phone Number']}\t${row['Store Name'] || ''}\t${row['LGA'] || ''}\t${row['Store Address'] || ''}\t${formattedDate === 'N/A' ? '' : formattedDate}\t${executive}`;
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

        container.innerHTML = tableHTML;
        container.appendChild(footer);

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

    // UPDATED: generateMonitorPage now includes all columns
    const generateMonitorPage = (assignedUsers, dueDate) => {
        const creationDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const formattedDueDate = new Date(dueDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Churn Reactivation Live Monitor</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; background-color: #f8fafc; color: #334155; }
        header { background-color: white; padding: 1.5rem; border-bottom: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        main { padding: 2rem; max-width: 1400px; margin: 0 auto; }
        .header-content { display: flex; justify-content: space-between; align-items: center; }
        .header-info { font-size: 0.9rem; color: #64748b; }
        .refresh-btn { background-color: #2563eb; color: white; border: none; padding: 0.6rem 1rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: background-color 0.2s; }
        .refresh-btn:hover { background-color: #1d4ed8; }
        table { width: 100%; border-collapse: collapse; background-color: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-radius: 0.75rem; overflow: hidden; font-size: 0.9rem; }
        th, td { padding: 1rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
        thead { background-color: #f1f5f9; }
        th { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; }
        .status { font-weight: 700; padding: 0.25rem 0.5rem; border-radius: 999px; font-size: 0.8rem; text-align: center; }
        .status-reactivated { color: #15803d; background-color: #dcfce7; }
        .status-pending { color: #b45309; background-color: #fef3c7; }
        tr.reactivated { background-color: #f0fdf4; }
    </style>
</head>
<body>
    <header>
        <div class="header-content">
            <div>
                <h1 style="margin: 0;">Churn Reactivation Monitor</h1>
                <p class="header-info" style="margin: 0.25rem 0 0 0;">Created on: <strong>${creationDate}</strong> | Due Date: <strong>${formattedDueDate}</strong></p>
            </div>
            <button id="refresh-btn" class="refresh-btn">Refresh Status</button>
        </div>
    </header>
    <main>
        <table>
            <thead>
                <tr>
                    <th>Retailer Name</th>
                    <th>Phone Number</th>
                    <th>Store Name</th>
                    <th>LGA</th>
                    <th>Store Address</th>
                    <th>Last Sale Date</th>
                    <th>Assigned To</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody id="monitor-table-body">
                ${assignedUsers.map(user => `
                <tr data-phone="${user['Phone Number']}">
                    <td>${user['First Name']} ${user['Last Name']}</td>
                    <td>${user['Phone Number']}</td>
                    <td>${user['Store Name'] || 'N/A'}</td>
                    <td>${user['LGA'] || 'N/A'}</td>
                    <td>${user['Store Address'] || 'N/A'}</td>
                    <td>${formatDate(user['Created Date'])}</td>
                    <td>${user.assignedAE}</td>
                    <td><span class="status status-pending">Pending</span></td>
                </tr>`).join('')}
            </tbody>
        </table>
    </main>
    <script>
        // NEW: Embedded helper function to format dates
        function formatDate(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        };

        const assignedUsers = ${JSON.stringify(assignedUsers.map(u => u['Phone Number']))};
        const dueDate = '${dueDate}';
        const refreshBtn = document.getElementById('refresh-btn');

        async function checkReactivationStatus() {
            refreshBtn.textContent = 'Checking...';
            refreshBtn.disabled = true;
            
            // This must be your LIVE Render URL
            const API_ENDPOINT = 'https://pika-backend-monitor.onrender.com/api/v1/admin/analytics/activity-status';
            
            try {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phoneNumbers: assignedUsers, endDate: dueDate })
                });

                if (!response.ok) throw new Error('Network response was not ok');
                
                const data = await response.json();
                const reactivatedPhones = new Set(data.reactivated_users || []);
                
                document.querySelectorAll('#monitor-table-body tr').forEach(row => {
                    const phone = row.dataset.phone;
                    if (reactivatedPhones.has(phone)) {
                        row.classList.add('reactivated');
                        const statusCell = row.querySelector('.status');
                        statusCell.textContent = 'Reactivated';
                        statusCell.className = 'status status-reactivated';
                    }
                });

            } catch (error) {
                console.error('Error fetching reactivation status:', error);
                alert('Could not fetch reactivation status. Please check the console for errors.');
            } finally {
                refreshBtn.textContent = 'Refresh Status';
                refreshBtn.disabled = false;
            }
        }
        
        refreshBtn.addEventListener('click', checkReactivationStatus);
        
        document.addEventListener('DOMContentLoaded', checkReactivationStatus);
    <\/script>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `live-monitor_${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

    const renderCharts = (data) => {
        if (charts.userChart) charts.userChart.destroy();
        const userCtx = document.getElementById('user-chart').getContext('2d');
        charts.userChart = new Chart(userCtx, { type: 'bar', data: { labels: [`Period 1 Users`, `Period 2 Users`], datasets: [{ label: 'Total Users', data: [data.p1.count, data.p2.count], backgroundColor: ['#60a5fa', '#34d399'], borderColor: ['#3b82f6', '#10b981'], borderWidth: 1 }, { label: 'Retained', data: [0, data.retained], backgroundColor: '#a78bfa', borderColor: '#8b5cf6', borderWidth: 1 }] }, options: { responsive: true, plugins: { legend: { position: 'top' }, title: { display: false } }, scales: { y: { beginAtZero: true } } } });
    };

    const renderTransactionChart = (data) => {
        if (charts.transactionChart) charts.transactionChart.destroy();
        const transactionCtx = document.getElementById('transaction-chart').getContext('2d');
        charts.transactionChart = new Chart(transactionCtx, { type: 'bar', data: { labels: [`Period 1`, `Period 2`], datasets: [{ label: 'Transaction Volume (Count)', data: [data.p1.count, data.p2.count], backgroundColor: '#fbbf24', borderColor: '#f59e0b', borderWidth: 1 }, { label: 'Transaction Value (₦)', data: [data.p1.amount, data.p2.amount], backgroundColor: '#60a5fa', borderColor: '#3b82f6', borderWidth: 1 }] }, options: { responsive: true, plugins: { legend: { position: 'top' }, title: { display: false }, tooltip: { callbacks: { label: function(context) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.dataset.label.includes('Value')) { label += new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(context.parsed.y); } else { label += context.parsed.y; } return label; } } } }, scales: { y: { beginAtZero: true, ticks: { callback: function(value) { if (value >= 1000000) return (value / 1000000) + 'M'; if (value >= 1000) return (value / 1000) + 'K'; return value; } } } } } });
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
        container.addEventListener('dragleave', (e) => { e.preventDefault(); container.classList.remove('dragleave'); });
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

                return fullName.includes(searchTerm) ||
                       phone.includes(searchTerm) ||
                       lga.includes(searchTerm) ||
                       store.includes(searchTerm);
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
            columns: ['First Name', 'Last Name', 'Phone Number', 'LGA', 'Store Name', 'Store Address', 'Transaction Count', 'Total Amount']
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